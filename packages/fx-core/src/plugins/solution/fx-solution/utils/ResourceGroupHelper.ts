// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ResourceManagementClient } from "@azure/arm-resources";
import { ResourceGroupsCreateOrUpdateResponse } from "@azure/arm-resources/esm/models";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { RestError } from "@azure/ms-rest-js";
import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  LogProvider,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  returnSystemError,
  returnUserError,
  SolutionContext,
  traverse,
  UserError,
  UserInteraction,
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
import {
  FailedToCheckResourceGroupExistenceError,
  SolutionError,
  SolutionSource,
  UnauthorizedToCheckResourceGroupError,
} from "../constants";

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

export class ResourceGroupHelper {
  async createNewResourceGroup(
    azureAccountProvider: AzureAccountProvider,
    subscriptionId: string,
    subscriptionName: string,
    resourceGroupName: string,
    location: string,
    logProvider?: LogProvider
  ): Promise<Result<string, FxError>> {
    const azureToken = await azureAccountProvider.getAccountCredentialAsync();
    const rmClient = new ResourceManagementClient(azureToken!, subscriptionId);
    const maybeExist = await this.checkResourceGroupExistence(
      rmClient,
      resourceGroupName,
      subscriptionId,
      subscriptionName
    );
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
    let response: ResourceGroupsCreateOrUpdateResponse;
    try {
      response = await rmClient.resourceGroups.createOrUpdate(resourceGroupName, {
        location: location,
        tags: { "created-by": "teamsfx" },
      });
    } catch (e) {
      let errMsg: string;
      if (e instanceof Error) {
        errMsg = `Failed to create resource group ${resourceGroupName} due to ${e.name}:${e.message}`;
      } else {
        errMsg = `Failed to create resource group ${resourceGroupName} due to unknown error ${JSON.stringify(
          e
        )}`;
      }

      return err(
        returnUserError(
          new Error(errMsg),
          SolutionSource,
          SolutionError.FailedToCreateResourceGroup
        )
      );
    }

    if (response.name === undefined) {
      return err(
        returnSystemError(
          new Error(`Failed to create resource group ${resourceGroupName}`),
          SolutionSource,
          SolutionError.FailedToCreateResourceGroup
        )
      );
    }
    logProvider?.info(
      `[${PluginDisplayName.Solution}] askCommonQuestions - resource group:'${response.name}' created!`
    );
    return ok(response.name);
  }

  handleRestError(
    restError: RestError,
    resourceGroupName: string,
    subscriptionId: string,
    subscriptionName: string
  ): FxError {
    // ARM API will return 403 with empty body when users does not have permission to access the resource group
    if (restError.statusCode === 403) {
      return new UnauthorizedToCheckResourceGroupError(
        resourceGroupName,
        subscriptionId,
        subscriptionName
      );
    } else {
      return new FailedToCheckResourceGroupExistenceError(
        restError,
        resourceGroupName,
        subscriptionId,
        subscriptionName
      );
    }
  }

  async checkResourceGroupExistence(
    rmClient: ResourceManagementClient,
    resourceGroupName: string,
    subscriptionId: string,
    subscriptionName: string
  ): Promise<Result<boolean, FxError>> {
    try {
      const checkRes = await rmClient.resourceGroups.checkExistence(resourceGroupName);
      return ok(!!checkRes.body);
    } catch (e) {
      if (e instanceof RestError) {
        return err(this.handleRestError(e, resourceGroupName, subscriptionId, subscriptionName));
      } else {
        return err(
          new FailedToCheckResourceGroupExistenceError(
            e,
            resourceGroupName,
            subscriptionId,
            subscriptionName
          )
        );
      }
    }
  }

  async getResourceGroupInfo(
    ctx: SolutionContext | v2.Context,
    rmClient: ResourceManagementClient,
    resourceGroupName: string
  ): Promise<ResourceGroupInfo | undefined> {
    try {
      const getRes = await rmClient.resourceGroups.get(resourceGroupName);
      if (getRes.name) {
        return {
          createNewResourceGroup: false,
          name: getRes.name,
          location: getRes.location,
        };
      }
    } catch (error) {
      ctx.logProvider?.error(
        `[${PluginDisplayName.Solution}] failed to get resource group '${resourceGroupName}'. error = '${error}'`
      );
    }
    return undefined;
  }

  async getLocations(
    azureAccountProvider: AzureAccountProvider,
    rmClient: ResourceManagementClient
  ): Promise<Result<string[], FxError>> {
    const credential = await azureAccountProvider.getAccountCredentialAsync();
    let subscriptionClient = undefined;
    if (credential) {
      subscriptionClient = new SubscriptionClient(credential);
    } else {
      throw returnUserError(
        new Error(`Failed to get azure credential`),
        SolutionSource,
        SolutionError.FailedToGetAzureCredential
      );
    }
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
  ) {
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
   * Ask user to create a new resource group or use an exsiting resource group
   */
  async askResourceGroupInfo(
    ctx: SolutionContext,
    rmClient: ResourceManagementClient,
    inputs: Inputs,
    ui: UserInteraction,
    defaultResourceGroupName: string
  ): Promise<Result<ResourceGroupInfo, FxError>> {
    // TODO: support pagination
    let resourceGroupResults;
    try {
      resourceGroupResults = await rmClient.resourceGroups.list();
    } catch (error) {
      ctx.logProvider?.error(`Failed to list resource group: error '${error}'`);
      return err(
        returnSystemError(
          new Error(`Failed to list resource group`),
          SolutionSource,
          SolutionError.FailedToListResourceGroup
        )
      );
    }
    const resourceGroupNameLocations = resourceGroupResults
      .filter((item) => item.name)
      .map((item) => [item.name, item.location] as [string, string]);

    const locations = await this.getLocations(ctx, rmClient);
    if (locations.isErr()) {
      return err(locations.error);
    }

    const node = await this.getQuestionsForResourceGroup(
      defaultResourceGroupName,
      resourceGroupNameLocations,
      locations.value!
    );
    if (node) {
      const res = await traverse(node, inputs, ui);
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

    const resourceGroupName = inputs.targetResourceGroupName;
    if (resourceGroupName === newResourceGroupOption) {
      return ok({
        name: inputs[CoreQuestionNames.NewResourceGroupName],
        location: inputs[CoreQuestionNames.NewResourceGroupLocation],
        createNewResourceGroup: true,
      });
    } else {
      const targetResourceGroupName = inputs.targetResourceGroupName;
      if (typeof targetResourceGroupName !== "string") {
        return err(
          returnSystemError(
            new Error(`Failed to get user input for resource group info`),
            SolutionSource,
            SolutionError.FailedToListResourceGroup
          )
        );
      }

      const target = resourceGroupNameLocations.find((item) => item[0] == targetResourceGroupName);
      const location = target![1]; // location must exist because the user can only select from this list.
      return ok({
        createNewResourceGroup: false,
        name: targetResourceGroupName,
        location: location,
      });
    }
  }
}
