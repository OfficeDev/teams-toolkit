// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureResourceInfo } from "../interface/commonArgs";
import { ExternalApiCallError, PrerequisiteError } from "../error/componentError";
import { AzureAccountProvider } from "@microsoft/teamsfx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  StorageAccounts,
  StorageManagementClient,
  StorageManagementModels,
} from "@azure/arm-storage";
import { DeployConstant } from "../constant/deployConstant";

/**
 * parse Azure resource id into subscriptionId, resourceGroupName and resourceName
 * @param resourceId Azure resource id
 * @param pattern the pattern that used to parse resource id and extract info from it
 */
export function parseAzureResourceId(resourceId: string, pattern: RegExp): AzureResourceInfo {
  const result = resourceId.trim().match(pattern);
  if (!result || result.length != 4) {
    throw PrerequisiteError.somethingIllegal("resourceId", "plugins.bot.InvalidValue", [
      "resourceId",
      resourceId,
    ]);
  }
  return {
    subscriptionId: result[1].trim(),
    resourceGroupName: result[2].trim(),
    instanceId: result[3].trim(),
  };
}

/**
 * get Azure credential from Azure account provider
 * @param tokenProvider Azure account provider
 */
export async function getAzureAccountCredential(
  tokenProvider: AzureAccountProvider
): Promise<TokenCredentialsBase> {
  let credential;
  try {
    credential = await tokenProvider.getAccountCredentialAsync();
  } catch (e) {
    throw ExternalApiCallError.getAzureCredentialError(e);
  }

  if (!credential) {
    throw PrerequisiteError.somethingIllegal(
      "azureCredential",
      "plugin.hosting.FailRetrieveAzureCredentials",
      undefined,
      "plugin.hosting.LoginToAzure"
    );
  }
  return credential;
}

/**
 * create Azure Storage Blob Service Client
 * @param azureResource azure resource info
 * @param azureCredential azure user credential
 */
export async function createBlobServiceClient(
  azureResource: AzureResourceInfo,
  azureCredential: TokenCredentialsBase
): Promise<BlobServiceClient> {
  const storageAccountClient = new StorageManagementClient(
    azureCredential,
    azureResource.subscriptionId
  ).storageAccounts;
  const sasToken = await generateSasToken(
    storageAccountClient,
    azureResource.resourceGroupName,
    azureResource.instanceId
  );
  const blobUri = getBlobUri(azureResource.instanceId);
  return await getBlobServiceClient(blobUri, sasToken);
}

async function generateSasToken(
  client: StorageAccounts,
  resourceGroupName: string,
  storageName: string
): Promise<string> {
  const accountSasParameters: StorageManagementModels.AccountSasParameters = {
    // A workaround, to ignore type checking for the services/resourceTypes/permissions are enum type.
    services: "bf" as StorageManagementModels.Services,
    resourceTypes: "sco" as StorageManagementModels.SignedResourceTypes,
    permissions: "rwld" as StorageManagementModels.Permissions,
    sharedAccessStartTime: new Date(Date.now() - DeployConstant.SAS_TOKEN_LIFE_TIME_PADDING),
    sharedAccessExpiryTime: new Date(Date.now() + DeployConstant.SAS_TOKEN_LIFE_TIME),
  };

  const token = (await client.listAccountSAS(resourceGroupName, storageName, accountSasParameters))
    .accountSasToken;
  if (!token) {
    throw ExternalApiCallError.getSasTokenError();
  }
  return token;
}

export function getBlobUri(storageName: string): string {
  return `https://${storageName}.blob.core.windows.net`;
}

export async function getBlobServiceClient(
  blobUri: string,
  sasToken: string
): Promise<BlobServiceClient> {
  const connectionString = `BlobEndpoint=${blobUri};SharedAccessSignature=${sasToken}`;
  return BlobServiceClient.fromConnectionString(connectionString);
}
