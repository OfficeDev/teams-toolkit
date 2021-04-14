// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Messages {
    // Progress bar messages
    static readonly ScaffoldProgressTitle = "Tab frontend scaffolding";
    static readonly ProvisionProgressTitle = "Tab frontend provision";
    static readonly PreDeployProgressTitle = "Tab frontend building";
    static readonly DeployProgressTitle = "Tab frontend deployment";

    static readonly ProgressStart = "Preparing.";
    static readonly ProgressScaffold = "Scaffolding Tab frontend project.";
    static readonly ProgressCreateStorage = "Creating Azure Storage Account.";
    static readonly ProgressConfigure = "Configuring.";
    static readonly ProgressNPMInstall = "Running \"npm install\" for Tab frontend project.";
    static readonly ProgressBuild = "Building Tab frontend project.";
    static readonly ProgressCheckStorage = "Checking Azure Storage Account availability.";
    static readonly ProgressGetSrcAndDest = "Getting local source and remote destination to deploy.";
    static readonly ProgressClear = "Cleaning up Azure Storage Account.";
    static readonly ProgressUpload = "Uploading built Tab project to Azure Storage Account.";

    // Logging messages
    static readonly StartScaffold = (name: string) => `Start to scaffold ${name}.`;
    static readonly EndScaffold = (name: string) => `Successfully scaffold ${name}.`;
    static readonly StartPreProvision = (name: string) => `Start to pre-provision ${name}.`;
    static readonly EndPreProvision = (name: string) => `Successfully pre-provision ${name}.`;
    static readonly StartProvision = (name: string) => `Start to provision ${name}.`;
    static readonly EndProvision = (name: string) => `Successfully provision ${name}.`;
    static readonly StartPreDeploy = (name: string) => `Start to pre-deploy ${name}.`;
    static readonly EndPreDeploy = (name: string) => `Successfully pre-deploy ${name}.`;
    static readonly StartDeploy = (name: string) => `Start to deploy ${name}.`;
    static readonly EndDeploy = (name: string) => `Successfully deploy ${name}.`;
    static readonly StartPostDebug = (name: string) => `Start to post debug ${name}.`;
    static readonly SkipBuild = () => "No changes detected since last building, skip building Tab Frontend project.";
    static readonly SkipDeploy = () =>
        "No changes detected since last deployment, skip deploying Tab Frontend project.";

    static readonly StartCheckResourceGroupExistence = (name: string) =>
        `Start to check existence resource group: ${name}.`;
    static readonly StartCheckStaticWebsiteEnabled = (name: string) =>
        `Start to check if storage ${name} enables static website feature or not.`;
    static readonly StartCreateStorageAccount = (name: string, resourceGroupName: string) =>
        `Start to create Azure Storage Account ${name} in the resource group ${resourceGroupName}.`;
    static readonly StartEnableStaticWebsite = (name: string) =>
        `Start to enable static website feature for Azure Storage Account ${name}.`;
    static readonly SkipEnableStaticWebsite = (name: string) =>
        `Static website feature has been enabled for Azure Storage Account ${name}, skip enabling.`;
    static readonly StartSyncLocalToStorage = (localPath: string, storageName: string) =>
        `Start to sync local path ${localPath} to Azure Storage Account ${storageName}.`;
    static readonly StartDeleteAllBlobs = (storageName: string, containerName: string) =>
        `Start to delete all existing blobs in Azure Storage Account:${storageName}, container:${containerName}.`;
    static readonly StartUploadFiles = (sourceFolder: string, storageName: string) =>
        `Start to upload all files in "${sourceFolder}" to Azure Storage Account:${storageName}.`;

    static readonly FailedFetchManifest = (url: string) => `Failed to fetch manifest from URL: ${url}. Retrying...`;
    static readonly FailedFetchZip = (url: string) => `Failed to fetch zip package from URL: ${url}. Retrying...`;
    static readonly FailedFetchTemplate = () =>
        "Failed to fetch latest template from GitHub, fall back to using local template.";

    static readonly FailedOperationWithErrorCode = (doOperation: string, errorCode?: string) =>
        `Failed to ${doOperation} with error code: ${errorCode}.`;
    static readonly GetEmptyStorageEndpoint = () => "Get empty endpoint for new created Azure Storage Account.";
    static readonly GetEmptySasToken = () => "Get empty SAS token for Azure Storage Account.";
}
