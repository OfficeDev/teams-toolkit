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
import {
  FxError,
  IProgressHandler,
  LogProvider,
  Result,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { DriverContext, AzureResourceInfo } from "../../interface/commonArgs";
import { createBlobServiceClient } from "../../../utils/azureResourceOperation";
import { TokenCredential } from "@azure/identity";
import { wrapRun, wrapSummary } from "../../../utils/common";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { ProgressMessages } from "../../../messages";

const ACTION_NAME = "azureStorage/deploy";

@Service(ACTION_NAME)
export class AzureStorageDeployDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureStorageDeployDriverImpl(args, context);
    return wrapRun(() => impl.run(), undefined, context.logProvider);
  }

  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return wrapSummary(this.run.bind(this, args, ctx), ["driver.deploy.azureStorageDeploySummary"]);
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
    await this.progressBar?.start();
    await this.context.logProvider.debug("Start deploying to Azure Storage Service");
    await this.context.logProvider.debug("Get Azure Storage Service deploy credential");
    await this.progressBar?.next(ProgressMessages.getAzureStorageAccountInfo);
    const containerClient = await AzureStorageDeployDriverImpl.createContainerClient(
      azureResource,
      azureCredential
    );
    // delete all existing blobs
    await this.progressBar?.next(ProgressMessages.clearStorageExistsBlobs);
    await AzureStorageDeployDriverImpl.deleteAllBlobs(
      containerClient,
      azureResource.instanceId,
      this.context.logProvider
    );
    await this.context.logProvider.debug("Uploading files to Azure Storage Service");
    // upload all to storage
    await this.progressBar?.next(ProgressMessages.uploadFilesToStorage);
    const ig = await this.handleIgnore(args, this.context);
    const sourceFolder = this.distDirectory;
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
        return !ig.test(path.relative(sourceFolder, itemPath)).ignored;
      }
    );
    const responses = await Promise.all(tasks);
    const errorResponse = responses.find((res) => res.errorCode);
    if (errorResponse) {
      throw DeployExternalApiCallError.uploadToStorageError(sourceFolder, errorResponse);
    }
    await this.context.logProvider.debug("Upload files to Azure Storage Service successfully");
    await this.progressBar?.end(true);
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

  createProgressBar(ui?: UserInteraction): IProgressHandler | undefined {
    return ui?.createProgressBar(
      `Deploying ${this.workingDirectory ?? ""} to Azure Storage Service`,
      3
    );
  }
}
