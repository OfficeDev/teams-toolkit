// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author FanH <Siglud@gmail.com>
 */
import { AzureDeployImpl } from "./impl/azureDeployImpl";
import { DeployStepArgs } from "../../interface/buildAndDeployArgs";
import {
  BlobDeleteResponse,
  BlobItem,
  BlobUploadCommonResponse,
  BlockBlobParallelUploadOptions,
  ContainerClient,
} from "@azure/storage-blob";
import { DeployConstant, ProgressBarConstant } from "../../../constant/deployConstant";
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
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { HttpStatusCode, TelemetryConstant } from "../../../constant/commonConstant";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { progressBarHelper } from "./impl/progressBarHelper";
import { wrapAzureOperation } from "../../../utils/azureSdkErrorHandler";

const ACTION_NAME = "azureStorage/deploy";

@Service(ACTION_NAME)
export class AzureStorageDeployDriver implements StepDriver {
  readonly description: string = getLocalizedString(
    "driver.deploy.deployToAzureStorageDescription"
  );
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureStorageDeployDriverImpl(args, context);
    return (await impl.run()).result;
  }

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const impl = new AzureStorageDeployDriverImpl(args, ctx);
    return impl.run();
  }
}

/**
 * deploy to Azure Storage
 */
export class AzureStorageDeployDriverImpl extends AzureDeployImpl {
  protected summaries: () => string[] = () => [
    getLocalizedString("driver.deploy.azureStorageDeployDetailSummary", this.distDirectory),
  ];
  protected summaryPrepare: () => string[] = () => [];
  protected progressHandler: AsyncIterableIterator<void> = progressBarHelper(
    ProgressBarConstant.UPLOAD_DEPLOY_TO_AZURE_STORAGE_PROGRESS,
    this.progressBar
  );
  protected progressNames = ProgressBarConstant.UPLOAD_DEPLOY_TO_AZURE_STORAGE_PROGRESS;

  pattern =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Storage\/storageAccounts\/([^\/]*)/i;

  protected helpLink = "https://aka.ms/teamsfx-actions/azure-storage-deploy";

  async azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<void> {
    await this.context.logProvider.debug("Start deploying to Azure Storage Service");
    await this.context.logProvider.debug("Get Azure Storage Service deploy credential");
    await this.progressHandler?.next();
    const containerClient = await AzureStorageDeployDriverImpl.createContainerClient(
      azureResource,
      azureCredential
    );
    // delete all existing blobs
    await this.progressHandler?.next();
    await this.deleteAllBlobs(containerClient, azureResource.instanceId, this.context.logProvider);
    await this.context.logProvider.debug("Uploading files to Azure Storage Service");
    // upload all to storage
    await this.progressHandler?.next();
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
    if (errorResponse?._response?.status === HttpStatusCode.INTERNAL_SERVER_ERROR) {
      throw DeployExternalApiCallError.uploadToStorageRemoteError(sourceFolder, errorResponse);
    }
    if (errorResponse) {
      throw DeployExternalApiCallError.uploadToStorageError(
        sourceFolder,
        errorResponse,
        this.helpLink
      );
    }
    await this.context.logProvider.debug("Upload files to Azure Storage Service successfully");
    return;
  }

  private static async createContainerClient(
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<ContainerClient> {
    const blobServiceClient = await createBlobServiceClient(azureResource, azureCredential);
    return await wrapAzureOperation(
      async () => {
        const container = blobServiceClient.getContainerClient(
          DeployConstant.AZURE_STORAGE_CONTAINER_NAME
        );
        if (!(await container.exists())) {
          await container.create();
        }
        return container;
      },
      (e) => DeployExternalApiCallError.getStorageContainerRemoteError(e),
      (e) => DeployExternalApiCallError.getStorageContainerError(e)
    );
  }

  private async deleteAllBlobs(
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
    if (errorResponse?._response?.status === HttpStatusCode.INTERNAL_SERVER_ERROR) {
      throw DeployExternalApiCallError.clearStorageRemoteError(
        errorResponse?._response.status,
        errorResponse
      );
    }
    if (errorResponse) {
      throw DeployExternalApiCallError.clearStorageError(
        "delete blob",
        errorResponse.errorCode,
        errorResponse,
        this.helpLink
      );
    }
  }

  private static isBlobFile(blob: BlobItem): boolean {
    return (blob.properties.contentLength ?? -1) > 0;
  }

  createProgressBar(ui?: UserInteraction): IProgressHandler | undefined {
    return ui?.createProgressBar(
      `Deploying ${this.workingDirectory ?? ""} to Azure Storage Service`,
      this.progressNames.length
    );
  }
}
