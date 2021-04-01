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
} from '@azure/storage-blob';
import { ResourceGroups, ResourceManagementClientContext } from '@azure/arm-resources';
import { StorageAccounts, StorageManagementClient, StorageManagementModels } from '@azure/arm-storage';

import * as mime from 'mime';
import * as path from 'path';
import { Constants } from './constants';
import { FrontendConfig } from './configs';
import { Logger } from './utils/logger';
import { Messages } from './resources/messages';
import { Utils } from './utils';

export class AzureStorageClient {
    private resourceGroupClient: ResourceGroups;
    private storageAccountClient: StorageAccounts;

    private resourceGroupName: string;
    private storageName: string;
    private location: string;

    constructor(config: FrontendConfig) {
        this.resourceGroupName = config.resourceGroupName;
        this.storageName = config.storageName;
        this.location = config.location;

        this.resourceGroupClient = new ResourceGroups(
            new ResourceManagementClientContext(config.credentials, config.subscriptionId),
        );
        this.storageAccountClient = new StorageManagementClient(
            config.credentials,
            config.subscriptionId,
        ).storageAccounts;
    }

    public async doesResourceGroupExists(): Promise<boolean> {
        Logger.debug(Messages.StartCheckResourceGroupExistence(this.resourceGroupName));
        const result = await this.resourceGroupClient.checkExistence(this.resourceGroupName);
        return result.body;
    }

    public async doesStorageAccountExists(): Promise<boolean> {
        const result = await this.storageAccountClient.listByResourceGroup(this.resourceGroupName);
        if (result.find((storage) => storage.name === this.storageName)) {
            return true;
        }
        return false;
    }

    public async isStorageStaticWebsiteEnabled(): Promise<boolean | undefined> {
        Logger.debug(Messages.StartCheckStaticWebsiteEnabled(this.storageName));
        const blobClient = await AzureStorageClient.getBlobServiceClient(
            AzureStorageClient.getBlobUri(this.storageName),
            await AzureStorageClient.generateSasToken(
                this.storageAccountClient,
                this.resourceGroupName,
                this.storageName,
            ),
        );
        let result = (await blobClient.getProperties()).staticWebsite?.enabled;
        return result;
    }

    public async createStorageAccount(): Promise<string> {
        Logger.debug(Messages.StartCreateStorageAccount(this.storageName, this.resourceGroupName));
        const parameters = AzureStorageClient.getStorageAccountCreateParams(this.location);

        const response = await this.storageAccountClient.create(this.resourceGroupName, this.storageName, parameters);
        const endpoint: string | undefined = response.primaryEndpoints?.web;

        if (!endpoint) {
            throw new Error(Messages.GetEmptyStorageEndpoint());
        }

        return endpoint.endsWith('/') ? endpoint.substring(0, endpoint.length - 1) : endpoint;
    }

    public async enableStaticWebsite(): Promise<ServiceSetPropertiesResponse> {
        Logger.debug(Messages.StartEnableStaticWebsite(this.storageName));
        const properties: BlobServiceProperties = AzureStorageClient.getStaticWebsiteEnableParams();

        const blobClient = await AzureStorageClient.getBlobServiceClient(
            AzureStorageClient.getBlobUri(this.storageName),
            await AzureStorageClient.generateSasToken(
                this.storageAccountClient,
                this.resourceGroupName,
                this.storageName,
            ),
        );
        return blobClient.setProperties(properties);
    }

    public async getContainer(containerName: string): Promise<ContainerClient> {
        const blobClient = await AzureStorageClient.getBlobServiceClient(
            AzureStorageClient.getBlobUri(this.storageName),
            await AzureStorageClient.generateSasToken(
                this.storageAccountClient,
                this.resourceGroupName,
                this.storageName,
            ),
        );

        const container = blobClient.getContainerClient(containerName);
        if (!(await container.exists())) {
            await container.create();
        }
        return container;
    }

    public async deleteAllBlobs(client: ContainerClient): Promise<void> {
        Logger.debug(Messages.StartDeleteAllBlobs(this.storageName, Constants.AzureStorageWebContainer));

        const deleteJobs: Promise<BlobDeleteResponse>[] = [];
        for await (const blob of client.listBlobsFlat()) {
            if (AzureStorageClient.isBlobFile(blob)) {
                deleteJobs.push(client.deleteBlob(blob.name));
            }
        }

        const responses = await Promise.all(deleteJobs);
        const errorResponse = responses.find((res) => res.errorCode !== undefined);
        if (errorResponse) {
            throw new Error(Messages.FailedOperationWithErrorCode('delete blob', errorResponse.errorCode));
        }
    }

    public async uploadFiles(client: ContainerClient, sourceFolder: string): Promise<void> {
        Logger.debug(Messages.StartSyncLocalToStorage(sourceFolder, this.storageName));

        const filePathsToUpload = await Utils.listFilePaths(sourceFolder);
        const responses = await Promise.all(
            filePathsToUpload.map((filePath) => {
                const destFilePath: string = path.relative(sourceFolder, filePath);
                return AzureStorageClient.uploadLocalFile(client, filePath, destFilePath);
            }),
        );

        const errorResponse = responses.find((res) => res.errorCode !== undefined);
        if (errorResponse) {
            throw new Error(Messages.FailedOperationWithErrorCode('upload file', errorResponse.errorCode));
        }
    }

    static isBlobFile(blob: BlobItem): boolean {
        return blob.properties.contentLength !== undefined && blob.properties.contentLength > 0;
    }

    static uploadLocalFile(
        client: ContainerClient,
        filePath: string,
        blobPath: string,
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
        storageName: string,
    ): Promise<string> {
        const accountSasParameters: StorageManagementModels.AccountSasParameters = {
            // A workaround, to ignore type checking for the services/resourceTypes/permissions are enum type.
            services: 'bf' as StorageManagementModels.Services,
            resourceTypes: 'sco' as StorageManagementModels.SignedResourceTypes,
            permissions: 'rwld' as StorageManagementModels.Permissions,
            sharedAccessExpiryTime: new Date(Date.now() + Constants.SasTokenLifetime),
        };

        const token = (await client.listAccountSAS(resourceGroupName, storageName, accountSasParameters))
            .accountSasToken;
        if (!token) {
            throw new Error(Messages.GetEmptySasToken());
        }
        return token;
    }

    static getStorageAccountCreateParams(location: string): StorageManagementModels.StorageAccountCreateParameters {
        return {
            sku: {
                name: Constants.AzureStorageDefaultSku as StorageManagementModels.SkuName,
                tier: Constants.AzureStorageDefaultTier as StorageManagementModels.SkuTier,
            },
            kind: Constants.AzureStorageDefaultKind as StorageManagementModels.Kind,
            location: location,
            enableHttpsTrafficOnly: true,
            isHnsEnabled: true,
        };
    }

    static getStaticWebsiteEnableParams(): BlobServiceProperties {
        return {
            staticWebsite: {
                indexDocument: Constants.FrontendIndexDocument,
                errorDocument404Path: Constants.FrontendErrorDocument,
                enabled: true,
            },
        };
    }
}
