// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureDeployDriver } from "./azureDeployDriver";
import { DeployStepArgs } from "../../interface/buildAndDeployArgs";
import {
  BlobDeleteResponse,
  BlobItem,
  BlobUploadCommonResponse,
  BlockBlobParallelUploadOptions,
  ContainerClient,
} from "@azure/storage-blob";
import { DeployConstant } from "../../../constant/deployConstant";
import { DeployExternalApiCallError } from "../../../error/deployError";
import { forEachFileAndDir } from "../../../utils/fileOperation";
import * as fs from "fs-extra";
import path from "path";
import * as mime from "mime";
import { FxError, LogProvider, Result } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { StepDriver } from "../../interface/stepDriver";
import { DriverContext, AzureResourceInfo } from "../../interface/commonArgs";
import { createBlobServiceClient } from "../../../utils/azureResourceOperation";
import { TokenCredential } from "@azure/identity";
import { wrapRun } from "../../../utils/common";

@Service("azureStorage/deploy")
export class AzureStorageDeployDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureStorageDeployDriverImpl(args, context);
    return wrapRun(() => impl.run());
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
    azureCredential: TokenCredential
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
    const sourceFolder = args.distributionPath;
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
    const errorResponse = responses.find((res) => res.errorCode);
    if (errorResponse) {
      throw DeployExternalApiCallError.uploadToStorageError(sourceFolder, errorResponse);
    }
    return;
  }

  private static async createContainerClient(
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<ContainerClient> {
    const blobServiceClient = await createBlobServiceClient(azureResource, azureCredential);
    const container = blobServiceClient.getContainerClient(
      DeployConstant.AZURE_STORAGE_CONTAINER_NAME
    );
    if (!(await container.exists())) {
      await container.create();
    }
    return container;
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
    const errorResponse = responses.find((res) => res.errorCode);
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
