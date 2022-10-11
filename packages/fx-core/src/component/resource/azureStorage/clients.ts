// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  BlobDeleteResponse,
  BlobItem,
  BlobServiceClient,
  BlobServiceProperties,
  BlobUploadCommonResponse,
  BlockBlobParallelUploadOptions,
  ContainerClient,
  ServiceSetPropertiesResponse,
} from "@azure/storage-blob";
import {
  AccountSasParameters,
  Services,
  SignedResourceTypes,
  Permissions,
  StorageAccounts,
  StorageManagementClient,
} from "@azure/arm-storage";

import * as mime from "mime";
import * as path from "path";
import { StorageConfig } from "./configs";
import { LogProvider } from "@microsoft/teamsfx-api";
import { Messages } from "./messages";
import { StorageConstants } from "./constants";
import { listFilePaths } from "../../utils/fileOperation";

export class AzureStorageClient {
  private storageAccountClient: StorageAccounts;

  private resourceGroupName: string;
  private storageName: string;
  private logger?: LogProvider;

  constructor(config: StorageConfig, logger?: LogProvider) {
    this.resourceGroupName = config.resourceGroupName;
    this.storageName = config.storageName;
    this.storageAccountClient = new StorageManagementClient(
      config.credentials,
      config.subscriptionId
    ).storageAccounts;
    this.logger = logger;
  }

  public async isStorageStaticWebsiteEnabled(): Promise<boolean | undefined> {
    this.logger?.debug(Messages.StartCheckStaticWebsiteEnabled(this.storageName));
    const blobClient = await AzureStorageClient.getBlobServiceClient(
      AzureStorageClient.getBlobUri(this.storageName),
      await AzureStorageClient.generateSasToken(
        this.storageAccountClient,
        this.resourceGroupName,
        this.storageName
      )
    );
    const result = (await blobClient.getProperties()).staticWebsite?.enabled;
    return result;
  }

  public async enableStaticWebsite(): Promise<ServiceSetPropertiesResponse | undefined> {
    this.logger?.debug(Messages.StartEnableStaticWebsite(this.storageName));

    if (await this.isStorageStaticWebsiteEnabled()) {
      this.logger?.debug(Messages.SkipEnableStaticWebsite(this.storageName));
      return;
    }

    const properties: BlobServiceProperties = AzureStorageClient.getStaticWebsiteEnableParams();

    const blobClient = await AzureStorageClient.getBlobServiceClient(
      AzureStorageClient.getBlobUri(this.storageName),
      await AzureStorageClient.generateSasToken(
        this.storageAccountClient,
        this.resourceGroupName,
        this.storageName
      )
    );
    return blobClient.setProperties(properties);
  }

  public async getContainer(containerName: string): Promise<ContainerClient> {
    const blobClient = await AzureStorageClient.getBlobServiceClient(
      AzureStorageClient.getBlobUri(this.storageName),
      await AzureStorageClient.generateSasToken(
        this.storageAccountClient,
        this.resourceGroupName,
        this.storageName
      )
    );

    const container = blobClient.getContainerClient(containerName);
    if (!(await container.exists())) {
      await container.create();
    }
    return container;
  }

  public async deleteAllBlobs(client: ContainerClient): Promise<void> {
    this.logger?.debug(
      Messages.StartDeleteAllBlobs(this.storageName, StorageConstants.azureStorageWebContainer)
    );

    const deleteJobs: Promise<BlobDeleteResponse>[] = [];
    for await (const blob of client.listBlobsFlat()) {
      if (AzureStorageClient.isBlobFile(blob)) {
        deleteJobs.push(client.deleteBlob(blob.name));
      }
    }

    const responses = await Promise.all(deleteJobs);
    const errorResponse = responses.find((res) => res.errorCode !== undefined);
    if (errorResponse) {
      this.logger?.error(JSON.stringify(errorResponse));
      throw new Error(
        Messages.FailedOperationWithErrorCode("delete blob", errorResponse.errorCode)
      );
    }
  }

  public async uploadFiles(client: ContainerClient, sourceFolder: string): Promise<void> {
    this.logger?.debug(Messages.StartSyncLocalToStorage(sourceFolder, this.storageName));

    const filePathsToUpload = await listFilePaths(sourceFolder);
    const responses = await Promise.all(
      filePathsToUpload.map((filePath) => {
        const destFilePath: string = path.relative(sourceFolder, filePath);
        return AzureStorageClient.uploadLocalFile(client, filePath, destFilePath);
      })
    );

    const errorResponse = responses.find((res) => res.errorCode !== undefined);
    if (errorResponse) {
      this.logger?.error(JSON.stringify(errorResponse));
      throw new Error(
        Messages.FailedOperationWithErrorCode("upload file", errorResponse.errorCode)
      );
    }
  }

  static isBlobFile(blob: BlobItem): boolean {
    return blob.properties.contentLength !== undefined && blob.properties.contentLength > 0;
  }

  static uploadLocalFile(
    client: ContainerClient,
    filePath: string,
    blobPath: string
  ): Promise<BlobUploadCommonResponse> {
    const blockBlobClient = client.getBlockBlobClient(blobPath);

    const options: BlockBlobParallelUploadOptions = {
      blobHTTPHeaders: {
        blobContentType: mime.getType(blobPath) || undefined,
      },
    };
    return blockBlobClient.uploadFile(filePath, options);
  }

  static async getBlobServiceClient(blobUri: string, sasToken: string): Promise<BlobServiceClient> {
    const connectionString = `BlobEndpoint=${blobUri};SharedAccessSignature=${sasToken}`;
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  static getBlobUri(storageName: string): string {
    return `https://${storageName}.blob.core.windows.net`;
  }

  static async generateSasToken(
    client: StorageAccounts,
    resourceGroupName: string,
    storageName: string
  ): Promise<string> {
    const accountSasParameters: AccountSasParameters = {
      // A workaround, to ignore type checking for the services/resourceTypes/permissions are enum type.
      services: "bf" as Services,
      resourceTypes: "sco" as SignedResourceTypes,
      permissions: "rwld" as Permissions,
      sharedAccessStartTime: new Date(Date.now() - StorageConstants.sasTokenLifetimePadding),
      sharedAccessExpiryTime: new Date(Date.now() + StorageConstants.sasTokenLifetime),
    };

    const token = (
      await client.listAccountSAS(resourceGroupName, storageName, accountSasParameters)
    ).accountSasToken;
    if (!token) {
      throw new Error(Messages.GetEmptySasToken);
    }
    return token;
  }

  static getStaticWebsiteEnableParams(): BlobServiceProperties {
    return {
      staticWebsite: {
        indexDocument: StorageConstants.indexDocument,
        errorDocument404Path: StorageConstants.errorDocument,
        enabled: true,
      },
    };
  }
}
