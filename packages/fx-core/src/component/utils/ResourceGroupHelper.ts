// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ResourceManagementClient } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  OptionItem,
  Platform,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import { TOOLS } from "../../core/globalVars";
import {
  CheckResourceGroupExistenceError,
  CreateResourceGroupError,
  GetResourceGroupError,
  InvalidAzureCredentialError,
  ListResourceGroupLocationsError,
  ListResourceGroupsError,
  ResourceGroupConflictError,
} from "../../error/azure";
import { resourceGroupQuestionNode } from "../../question/other";
import { QuestionNames } from "../../question/questionNames";
import { traverse } from "../../ui/visitor";
import { SolutionSource } from "../constants";

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
    const rmClient = await this.createRmClient(azureAccountProvider, subscriptionId);
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
      let result;
      do {
        result = await res.next();
        if (result.value?.name) results.push([result.value.name, result.value.location]);
      } while (!result.done);
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
      let result;
      do {
        result = await res.next();
        if (result.value?.displayName) locations.push(result.value.displayName);
      } while (!result.done);
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

  /**
   * Ask user to create a new resource group or use an existing resource group  V3
   */
  async askResourceGroupInfoV3(
    inputs: InputsWithProjectPath,
    azureAccountProvider: AzureAccountProvider,
    rmClient: ResourceManagementClient,
    defaultResourceGroupName: string
  ): Promise<Result<ResourceGroupInfo, FxError>> {
    const node = resourceGroupQuestionNode(
      azureAccountProvider,
      rmClient.subscriptionId,
      defaultResourceGroupName
    );
    if (node) {
      const res = await traverse(node, inputs, TOOLS.ui);
      if (res.isErr()) {
        return err(res.error);
      }
    }

    const targetResourceGroupNameOptionItem = inputs[
      QuestionNames.TargetResourceGroupName
    ] as unknown as OptionItem;

    const targetResourceGroupName = targetResourceGroupNameOptionItem.id;
    if (!targetResourceGroupName || typeof targetResourceGroupName !== "string") {
      return err(
        new UserError(SolutionSource, "InvalidInputError", "Invalid targetResourceGroupName")
      );
    }
    if (targetResourceGroupName === newResourceGroupOption) {
      return ok({
        name: inputs[QuestionNames.NewResourceGroupName],
        location: inputs[QuestionNames.NewResourceGroupLocation],
        createNewResourceGroup: true,
      });
    } else {
      const location = targetResourceGroupNameOptionItem.description!; // location must exist because the user can only select from this list.
      return ok({
        createNewResourceGroup: false,
        name: targetResourceGroupName,
        location: location,
      });
    }
  }

  async createRmClient(azureAccountProvider: AzureAccountProvider, subscriptionId: string) {
    const azureToken = await azureAccountProvider.getIdentityCredentialAsync();
    if (azureToken === undefined) {
      throw new InvalidAzureCredentialError();
    }
    await azureAccountProvider.setSubscription(subscriptionId);
    const rmClient = new ResourceManagementClient(azureToken, subscriptionId);
    return rmClient;
  }
}

export const resourceGroupHelper = new ResourceGroupHelper();
