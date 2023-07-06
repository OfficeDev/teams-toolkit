// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ResourceManagementClient } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  Platform,
  QTreeNode,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import { TOOLS } from "../../core/globalVars";
import {
  newResourceGroupNameQuestion,
  QuestionNewResourceGroupLocation,
  QuestionSelectResourceGroup,
} from "../../core/question";
import {
  CheckResourceGroupExistenceError,
  CreateResourceGroupError,
  GetResourceGroupError,
  InvalidAzureCredentialError,
  ListResourceGroupLocationsError,
  ListResourceGroupsError,
  ResourceGroupConflictError,
} from "../../error/azure";
import { SolutionSource } from "../constants";
import { traverse } from "../../ui/visitor";
import { QuestionNames } from "../../question/questionNames";

const MsResources = "Microsoft.Resources";
const ResourceGroups = "resourceGroups";

export type ResourceGroupInfo = {
  createNewResourceGroup: boolean;
  name: string;
  location: string;
};

// TODO: use the emoji plus sign like Azure Functions extension
const newResourceGroupOption = "+ New resource group";

class ResourceGroupHelper {
  async createNewResourceGroup(
    resourceGroupName: string,
    azureAccountProvider: AzureAccountProvider,
    subscriptionId: string,
    location: string
  ): Promise<Result<string, FxError>> {
    const azureToken = await azureAccountProvider.getIdentityCredentialAsync();
    if (!azureToken) return err(new InvalidAzureCredentialError());
    const rmClient = new ResourceManagementClient(azureToken, subscriptionId);
    const maybeExist = await this.checkResourceGroupExistence(resourceGroupName, rmClient);
    if (maybeExist.isErr()) {
      return err(maybeExist.error);
    }
    if (maybeExist.value) {
      return err(new ResourceGroupConflictError(resourceGroupName, subscriptionId));
    }
    try {
      const response = await rmClient.resourceGroups.createOrUpdate(resourceGroupName, {
        location: location,
        tags: { "created-by": "teamsfx" },
      });
      if (response.name === undefined) {
        return err(
          new CreateResourceGroupError(
            resourceGroupName,
            subscriptionId,
            `illegal response: ${JSON.stringify(response)}`
          )
        );
      }
      return ok(response.name);
    } catch (e: any) {
      return err(
        new CreateResourceGroupError(
          resourceGroupName,
          subscriptionId,
          e.message || JSON.stringify(e)
        )
      );
    }
  }

  async checkResourceGroupExistence(
    resourceGroupName: string,
    rmClient: ResourceManagementClient
  ): Promise<Result<boolean, FxError>> {
    try {
      const checkRes = await rmClient.resourceGroups.checkExistence(resourceGroupName);
      return ok(!!checkRes.body);
    } catch (e) {
      return err(
        new CheckResourceGroupExistenceError(
          resourceGroupName,
          rmClient.subscriptionId,
          JSON.stringify(e)
        )
      );
    }
  }

  async getResourceGroupInfo(
    resourceGroupName: string,
    rmClient: ResourceManagementClient
  ): Promise<Result<ResourceGroupInfo | undefined, FxError>> {
    try {
      const getRes = await rmClient.resourceGroups.get(resourceGroupName);
      if (getRes.name) {
        return ok({
          createNewResourceGroup: false,
          name: getRes.name,
          location: getRes.location,
        });
      } else return ok(undefined);
    } catch (e: any) {
      return err(
        new GetResourceGroupError(
          resourceGroupName,
          rmClient.subscriptionId,
          e.message || JSON.stringify(e)
        )
      );
    }
  }

  async listResourceGroups(
    rmClient: ResourceManagementClient
  ): Promise<Result<[string, string][], FxError>> {
    try {
      const results: [string, string][] = [];
      const res = rmClient.resourceGroups.list();
      let result = await res.next();
      if (result.value.name) results.push([result.value.name, result.value.location]);
      while (!result.done) {
        if (result.value.name) results.push([result.value.name, result.value.location]);
        result = await res.next();
      }
      return ok(results);
    } catch (e: any) {
      return err(
        new ListResourceGroupsError(rmClient.subscriptionId, e.message || JSON.stringify(e))
      );
    }
  }

  async getLocations(
    azureAccountProvider: AzureAccountProvider,
    rmClient: ResourceManagementClient
  ): Promise<Result<string[], FxError>> {
    const azureToken = await azureAccountProvider.getIdentityCredentialAsync();
    if (!azureToken) return err(new InvalidAzureCredentialError());
    const subscriptionClient = new SubscriptionClient(azureToken);
    const askSubRes = await azureAccountProvider.getSelectedSubscription(true);
    try {
      const res = subscriptionClient.subscriptions.listLocations(askSubRes!.subscriptionId);
      const locations: string[] = [];
      let result = await res.next();
      if (result.value.displayName) locations.push(result.value.displayName);
      while (!result.done) {
        if (result.value.displayName) locations.push(result.value.displayName);
        result = await res.next();
      }
      const providerData = await rmClient.providers.get(MsResources);
      const resourceTypeData = providerData.resourceTypes?.find(
        (rt) => rt.resourceType?.toLowerCase() === ResourceGroups.toLowerCase()
      );
      const resourceLocations = resourceTypeData?.locations;
      const rgLocations = resourceLocations?.filter((item) => locations.includes(item));
      if (!rgLocations || rgLocations.length == 0) {
        return err(
          new ListResourceGroupLocationsError(
            rmClient.subscriptionId,
            "No available locations found!"
          )
        );
      }
      return ok(rgLocations);
    } catch (e: any) {
      return err(
        new ListResourceGroupLocationsError(rmClient.subscriptionId, e.message || JSON.stringify(e))
      );
    }
  }

  async getQuestionsForResourceGroup(
    defaultResourceGroupName: string,
    existingResourceGroupNameLocations: [string, string][],
    availableLocations: string[],
    rmClient: ResourceManagementClient
  ): Promise<QTreeNode | undefined> {
    const selectResourceGroup = QuestionSelectResourceGroup();
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

    const existingResourceGroupNames = existingResourceGroupNameLocations.map((item) => item[0]);
    const inputNewResourceGroupName = newResourceGroupNameQuestion(existingResourceGroupNames);
    inputNewResourceGroupName.default = defaultResourceGroupName;
    const newResourceGroupNameNode = new QTreeNode(inputNewResourceGroupName);
    newResourceGroupNameNode.condition = { equals: newResourceGroupOption };
    node.addChild(newResourceGroupNameNode);

    const selectLocation = QuestionNewResourceGroupLocation();
    // TODO: maybe lazily load locations
    selectLocation.staticOptions = availableLocations;
    selectLocation.default = "East US";
    const newResourceGroupLocationNode = new QTreeNode(selectLocation);
    newResourceGroupNameNode.addChild(newResourceGroupLocationNode);

    return node.trim();
  }

  /**
   * Ask user to create a new resource group or use an existing resource group  V3
   */
  async askResourceGroupInfoV3(
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
      getLocationsRes.value,
      rmClient
    );
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    if (node) {
      const res = await traverse(node, inputs, TOOLS.ui);
      if (res.isErr()) {
        return err(res.error);
      }
    }
    const targetResourceGroupName = inputs.targetResourceGroupName;
    if (!targetResourceGroupName || typeof targetResourceGroupName !== "string") {
      return err(
        new UserError(SolutionSource, "InvalidInputError", "Invalid targetResourceGroupName")
      );
    }
    const resourceGroupName = inputs.targetResourceGroupName;
    if (resourceGroupName === newResourceGroupOption) {
      return ok({
        name: inputs[QuestionNames.NewResourceGroupName],
        location: inputs[QuestionNames.NewResourceGroupLocation],
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
