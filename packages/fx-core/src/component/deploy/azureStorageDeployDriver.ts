// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureDeployDriver } from "./azureDeployDriver";
import { AzureResourceInfo, DeployStepArgs, DriverContext } from "../interface/buildAndDeployArgs";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import {
  BlobDeleteResponse,
  BlobItem,
  BlobServiceClient,
  BlobUploadCommonResponse,
  BlockBlobParallelUploadOptions,
  ContainerClient,
} from "@azure/storage-blob";
import {
  StorageAccounts,
  StorageManagementClient,
  StorageManagementModels,
} from "@azure/arm-storage";
import { DeployConstant } from "../constant/deployConstant";
import { DeployExternalApiCallError } from "../error/deployError";
import { forEachFileAndDir } from "../utils/fileOperation";
import * as fs from "fs-extra";
import path from "path";
import * as mime from "mime";
import { LogProvider } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";

@Service("deploy/azureStorage")
export class AzureStorageDeployDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const impl = new AzureStorageDeployDriverImpl(args, context);
    return await impl.run();
  }
}

/**
 * deploy to Azure Storage
 */
export class AzureStorageDeployDriverImpl extends AzureDeployDriver {
  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Storage\/storageAccounts\/([^\/]*)/i;

  async azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredentialsBase
  ): Promise<void> {
    const containerClient = await AzureStorageDeployDriverImpl.createContainerClient(
      azureResource,
      azureCredential
    );
    // delete all existing blobs
    await AzureStorageDeployDriverImpl.deleteAllBlobs(
      containerClient,
      azureResource.instanceId,
      this.context.logProvider
    );
    // upload all to storage
    const ig = await this.handleIgnore(args, this.context);
    const sourceFolder = args.dist;
    const tasks: Promise<BlobUploadCommonResponse>[] = [];
    await forEachFileAndDir(
      sourceFolder,
      (filePath: string, stats: fs.Stats) => {
        const destFilePath: string = path.relative(sourceFolder, filePath);
        if (!destFilePath || stats.isDirectory()) {
          return;
        }
        const options: BlockBlobParallelUploadOptions = {
          blobHTTPHeaders: {
            blobContentType: mime.getType(filePath) || undefined,
          },
        };
        const client = containerClient.getBlockBlobClient(destFilePath);
        tasks.push(client.uploadFile(filePath, options));
      },
      (itemPath: string) => {
        return ig.test(path.relative(sourceFolder, itemPath)).unignored;
      }
    );
    const responses = await Promise.all(tasks);
    const errorResponse = responses.find((res) => res.errorCode !== undefined);
    if (errorResponse) {
      throw DeployExternalApiCallError.uploadToStorageError(sourceFolder, errorResponse);
    }
    return;
  }

  private static async createContainerClient(
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredentialsBase
  ): Promise<ContainerClient> {
    const storageAccountClient = new StorageManagementClient(
      azureCredential,
      azureResource.subscriptionId
    ).storageAccounts;
    const sasToken = await AzureStorageDeployDriverImpl.generateSasToken(
      storageAccountClient,
      azureResource.resourceGroupName,
      azureResource.instanceId
    );
    const blobUri = AzureStorageDeployDriverImpl.getBlobUri(azureResource.instanceId);
    const blobServiceClient = await AzureStorageDeployDriverImpl.getBlobServiceClient(
      blobUri,
      sasToken
    );
    const container = blobServiceClient.getContainerClient(
      DeployConstant.AZURE_STORAGE_CONTAINER_NAME
    );
    if (!(await container.exists())) {
      await container.create();
    }
    return container;
  }

  private static async getBlobServiceClient(
    blobUri: string,
    sasToken: string
  ): Promise<BlobServiceClient> {
    const connectionString = `BlobEndpoint=${blobUri};SharedAccessSignature=${sasToken}`;
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  private static getBlobUri(storageName: string): string {
    return `https://${storageName}.blob.core.windows.net`;
  }

  private static async generateSasToken(
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

    const token = (
      await client.listAccountSAS(resourceGroupName, storageName, accountSasParameters)
    ).accountSasToken;
    if (!token) {
      throw DeployExternalApiCallError.getSasTokenError();
    }
    return token;
  }

  private static async deleteAllBlobs(
    client: ContainerClient,
    storageName: string,
    logProvider: LogProvider
  ): Promise<void> {
    await logProvider.debug(
      `Deleting all existing blobs in container '${DeployConstant.AZURE_STORAGE_CONTAINER_NAME}' for Azure Storage account '${storageName}'.`
    );

    const deleteJobs: Promise<BlobDeleteResponse>[] = [];
    for await (const blob of client.listBlobsFlat()) {
      if (AzureStorageDeployDriverImpl.isBlobFile(blob)) {
        deleteJobs.push(client.deleteBlob(blob.name));
      }
    }

    const responses = await Promise.all(deleteJobs);
    const errorResponse = responses.find((res) => res.errorCode !== undefined);
    if (errorResponse) {
      throw DeployExternalApiCallError.clearStorageError(
        "delete blob",
        errorResponse.errorCode,
        errorResponse
      );
    }
  }

  private static isBlobFile(blob: BlobItem): boolean {
    return (blob.properties.contentLength ?? -1) > 0;
  }
}
