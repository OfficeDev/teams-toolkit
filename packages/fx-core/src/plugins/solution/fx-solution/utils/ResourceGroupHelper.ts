// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ResourceManagementClient } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { RestError } from "@azure/ms-rest-js";
import { HookContext, hooks, Middleware, NextFunction } from "@feathersjs/hooks";
import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  returnUserError,
  traverse,
  UserError,
  v2,
} from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../../../common/constants";
import { desensitize } from "../../../../core/middleware/questionModel";
import {
  CoreQuestionNames,
  QuestionNewResourceGroupLocation,
  QuestionNewResourceGroupName,
  QuestionSelectResourceGroup,
} from "../../../../core/question";
import { SolutionError, SolutionSource } from "../constants";

const MsResources = "Microsoft.Resources";
const ResourceGroups = "resourceGroups";

export type AzureSubscription = {
  displayName: string;
  subscriptionId: string;
};

export const DefaultResourceGroupLocation = "East US";
export type ResourceGroupInfo = {
  createNewResourceGroup: boolean;
  name: string;
  location: string;
};

// TODO: use the emoji plus sign like Azure Functions extension
const newResourceGroupOption = "+ New resource group";

export function ResourceGroupErrorHandlerMW(operation: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const resourceGroupName =
      ctx.arguments.length > 0 && typeof ctx.arguments[0] === "string"
        ? (ctx.arguments[0] as string)
        : undefined;
    try {
      await next();
    } catch (e) {
      const fxError = new ResourceGroupApiError(operation, resourceGroupName, e);
      ctx.result = err(fxError);
    }
  };
}

export class ResourceGroupApiError extends UserError {
  constructor(operation: string, resourceGroupName?: string, error?: any) {
    const baseErrorMessage = `${operation} failed ${
      resourceGroupName ? "resource group:" + resourceGroupName : ""
    }`;
    const errorName = new.target.name;
    if (!error) super(new.target.name, baseErrorMessage, SolutionSource);
    else if (error instanceof RestError) {
      const restError = error as RestError;
      // Avoid sensitive information like request headers in the error message.
      const rawErrorString = JSON.stringify({
        code: restError.code,
        statusCode: restError.statusCode,
        body: restError.body,
        name: restError.name,
        message: restError.message,
      });
      super(errorName, `${baseErrorMessage}, error: '${rawErrorString}'`, SolutionSource);
    } else if (error instanceof Error) {
      super({ name: errorName, error: error });
    } else {
      super(errorName, `${baseErrorMessage}, error: '${JSON.stringify(error)}'`, SolutionSource);
    }
  }
}

export class ResourceGroupHelper {
  @hooks([ResourceGroupErrorHandlerMW("create")])
  async createNewResourceGroup(
    resourceGroupName: string,
    azureAccountProvider: AzureAccountProvider,
    subscriptionId: string,
    location: string
  ): Promise<Result<string, FxError>> {
    const azureToken = await azureAccountProvider.getAccountCredentialAsync();
    if (!azureToken)
      return err(
        new UserError(
          SolutionError.FailedToGetAzureCredential,
          "Failed to get azure credential",
          SolutionSource
        )
      );
    const rmClient = new ResourceManagementClient(azureToken, subscriptionId);
    const maybeExist = await this.checkResourceGroupExistence(resourceGroupName, rmClient);
    if (maybeExist.isErr()) {
      return err(maybeExist.error);
    }
    if (maybeExist.value) {
      return err(
        new UserError(
          SolutionError.FailedToCreateResourceGroup,
          `Failed to create resource group "${resourceGroupName}": the resource group exists`,
          SolutionSource
        )
      );
    }
    const response = await rmClient.resourceGroups.createOrUpdate(resourceGroupName, {
      location: location,
      tags: { "created-by": "teamsfx" },
    });
    if (response.name === undefined) {
      return err(new ResourceGroupApiError("create", resourceGroupName));
    }
    return ok(response.name);
  }

  @hooks([ResourceGroupErrorHandlerMW("checkExistence")])
  async checkResourceGroupExistence(
    resourceGroupName: string,
    rmClient: ResourceManagementClient
  ): Promise<Result<boolean, FxError>> {
    const checkRes = await rmClient.resourceGroups.checkExistence(resourceGroupName);
    return ok(!!checkRes.body);
  }

  @hooks([ResourceGroupErrorHandlerMW("get")])
  async getResourceGroupInfo(
    resourceGroupName: string,
    rmClient: ResourceManagementClient
  ): Promise<Result<ResourceGroupInfo | undefined, FxError>> {
    const getRes = await rmClient.resourceGroups.get(resourceGroupName);
    if (getRes.name) {
      return ok({
        createNewResourceGroup: false,
        name: getRes.name,
        location: getRes.location,
      });
    } else return ok(undefined);
  }

  @hooks([ResourceGroupErrorHandlerMW("list")])
  async listResourceGroups(
    rmClient: ResourceManagementClient
  ): Promise<Result<[string, string][], FxError>> {
    const resourceGroupResults = await rmClient.resourceGroups.list();
    const resourceGroupNameLocations = resourceGroupResults
      .filter((item) => item.name)
      .map((item) => [item.name, item.location] as [string, string]);
    return ok(resourceGroupNameLocations);
  }

  async getLocations(
    azureAccountProvider: AzureAccountProvider,
    rmClient: ResourceManagementClient
  ): Promise<Result<string[], FxError>> {
    const azureToken = await azureAccountProvider.getAccountCredentialAsync();
    if (!azureToken)
      return err(
        new UserError(
          SolutionError.FailedToGetAzureCredential,
          "Failed to get azure credential",
          SolutionSource
        )
      );
    const subscriptionClient = new SubscriptionClient(azureToken);
    const askSubRes = await azureAccountProvider.getSelectedSubscription(true);
    const listLocations = await subscriptionClient.subscriptions.listLocations(
      askSubRes!.subscriptionId
    );
    const locations = listLocations.map((item) => item.displayName);
    const providerData = await rmClient.providers.get(MsResources);
    const resourceTypeData = providerData.resourceTypes?.find(
      (rt) => rt.resourceType?.toLowerCase() === ResourceGroups.toLowerCase()
    );
    const resourceLocations = resourceTypeData?.locations;
    const rgLocations = resourceLocations?.filter((item) => locations.includes(item));
    if (!rgLocations || rgLocations.length == 0) {
      return err(
        returnUserError(
          new Error(`Failed to list resource group locations`),
          SolutionSource,
          SolutionError.FailedToListResourceGroupLocation
        )
      );
    }
    return ok(rgLocations);
  }

  async getQuestionsForResourceGroup(
    defaultResourceGroupName: string,
    existingResourceGroupNameLocations: [string, string][],
    availableLocations: string[]
  ): Promise<QTreeNode | undefined> {
    const selectResourceGroup = QuestionSelectResourceGroup;
    const staticOptions: OptionItem[] = [
      { id: newResourceGroupOption, label: newResourceGroupOption },
    ];
    selectResourceGroup.staticOptions = staticOptions.concat(
      existingResourceGroupNameLocations.map((item) => {
        return {
          id: item[0],
          label: item[0],
          description: item[1],
        };
      })
    );

    const node = new QTreeNode(selectResourceGroup);

    const inputNewResourceGroupName = QuestionNewResourceGroupName;
    inputNewResourceGroupName.default = defaultResourceGroupName;
    const newResourceGroupNameNode = new QTreeNode(inputNewResourceGroupName);
    newResourceGroupNameNode.condition = { equals: newResourceGroupOption };
    node.addChild(newResourceGroupNameNode);

    const selectLocation = QuestionNewResourceGroupLocation;
    // TODO: maybe lazily load locations
    selectLocation.staticOptions = availableLocations;
    const newResourceGroupLocationNode = new QTreeNode(selectLocation);
    newResourceGroupNameNode.addChild(newResourceGroupLocationNode);

    return node.trim();
  }

  /**
   * Ask user to create a new resource group or use an existing resource group
   */
  async askResourceGroupInfo(
    ctx: v2.Context,
    inputs: Inputs,
    azureAccountProvider: AzureAccountProvider,
    rmClient: ResourceManagementClient,
    defaultResourceGroupName: string
  ): Promise<Result<ResourceGroupInfo, FxError>> {
    const listRgRes = await this.listResourceGroups(rmClient);
    if (listRgRes.isErr()) return err(listRgRes.error);

    const getLocationsRes = await this.getLocations(azureAccountProvider, rmClient);
    if (getLocationsRes.isErr()) {
      return err(getLocationsRes.error);
    }

    const node = await this.getQuestionsForResourceGroup(
      defaultResourceGroupName,
      listRgRes.value,
      getLocationsRes.value
    );
    if (node) {
      const res = await traverse(node, inputs, ctx.userInteraction);
      if (res.isErr()) {
        ctx.logProvider?.debug(
          `[${PluginDisplayName.Solution}] failed to run question model for target resource group.`
        );
        return err(res.error);
      }

      const desensitized = desensitize(node, inputs);
      ctx.logProvider?.info(
        `[${
          PluginDisplayName.Solution
        }] success to run question model for resource group, answers:${JSON.stringify(
          desensitized
        )}`
      );
    }
    const targetResourceGroupName = inputs.targetResourceGroupName;
    if (!targetResourceGroupName || typeof targetResourceGroupName !== "string") {
      return err(
        new UserError("InvalidInputError", "Invalid targetResourceGroupName", SolutionSource)
      );
    }
    const resourceGroupName = inputs.targetResourceGroupName;
    if (resourceGroupName === newResourceGroupOption) {
      return ok({
        name: inputs[CoreQuestionNames.NewResourceGroupName],
        location: inputs[CoreQuestionNames.NewResourceGroupLocation],
        createNewResourceGroup: true,
      });
    } else {
      const target = listRgRes.value.find((item) => item[0] == targetResourceGroupName);
      const location = target![1]; // location must exist because the user can only select from this list.
      return ok({
        createNewResourceGroup: false,
        name: targetResourceGroupName,
        location: location,
      });
    }
  }
}

export const resourceGroupHelper = new ResourceGroupHelper();
