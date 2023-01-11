// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TokenCredential } from "@azure/core-http";
import { AzureAccountProvider, v3 } from "@microsoft/teamsfx-api";
import { AzureOpsConstant } from "../../../common/azure-hosting/hostingConstant";
import { PreconditionError } from "../../../common/azure-hosting/hostingError";
import { CheckThrowSomethingMissing } from "../../error";
import {
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../common/tools";
import { errorSource } from "./constants";

export class StorageConfig {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  credentials: TokenCredential;

  storageName: string;

  public constructor(
    subscriptionId: string,
    resourceGroupName: string,
    location: string,
    storageName: string,
    credentials: TokenCredential
  ) {
    this.subscriptionId = subscriptionId;
    this.resourceGroupName = resourceGroupName;
    this.location = location;
    this.storageName = storageName;
    this.credentials = credentials;
  }

  public static async fromEnvInfo(
    envInfo: v3.EnvInfoV3,
    scenario: string,
    tokenProvider: AzureAccountProvider
  ): Promise<StorageConfig> {
    const credentials = await tokenProvider.getIdentityCredentialAsync();
    if (!credentials) {
      throw new PreconditionError(AzureOpsConstant.FAIL_TO_GET_AZURE_CREDENTIALS(), [
        AzureOpsConstant.TRY_LOGIN_AZURE(),
      ]);
    }
    const storage = envInfo.state[scenario];
    const resourceId = CheckThrowSomethingMissing<string>(
      errorSource,
      "storageResourceId",
      storage?.storageResourceId
    );
    return new StorageConfig(
      getSubscriptionIdFromResourceId(resourceId),
      getResourceGroupNameFromResourceId(resourceId),
      (envInfo.state.solution as v3.AzureSolutionConfig).location,
      getStorageAccountNameFromResourceId(resourceId),
      credentials
    );
  }
}
