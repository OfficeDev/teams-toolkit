// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Messages {
  // Progress bar messages
  static readonly ScaffoldProgressTitle = "Scaffolding Tab";
  static readonly ProvisionProgressTitle = "Provisioning Tab";
  static readonly PreDeployProgressTitle = "Building Tab";
  static readonly DeployProgressTitle = "Deploying Tab";

  static readonly ProgressStart = "Preparing.";
  static readonly ProgressScaffold = "Scaffolding Tab frontend project.";
  static readonly ProgressCreateStorage = "Creating Azure Storage account.";
  static readonly ProgressConfigure = "Configuring.";
  static readonly ProgressNPMInstall = "Running \"npm install\" for Tab frontend project.";
  static readonly ProgressBuild = "Building Tab frontend project.";
  static readonly ProgressCheckStorage = "Checking Azure Storage account availability.";
  static readonly ProgressGetSrcAndDest = "Retrieving deployment source and destination.";
  static readonly ProgressClear = "Cleaning up Azure Storage account.";
  static readonly ProgressUpload = "Uploading Tab frontend to Azure Storage account.";

  // Logging messages
  static readonly StartScaffold = (name: string) => `Scaffolding '${name}'.`;
  static readonly EndScaffold = (name: string) => `Successfully scaffolded '${name}'.`;
  static readonly StartPreProvision = (name: string) => `Pre-provisioning '${name}'.`;
  static readonly EndPreProvision = (name: string) => `Successfully pre-provisioned '${name}'.`;
  static readonly StartProvision = (name: string) => `Provisioning '${name}'.`;
  static readonly EndProvision = (name: string) => `Successfully provisioned '${name}'.`;
  static readonly StartPreDeploy = (name: string) => `Pre-deploying '${name}'.`;
  static readonly EndPreDeploy = (name: string) => `Pre-deployed '${name}'.`;
  static readonly StartDeploy = (name: string) => `Deploying '${name}'.`;
  static readonly EndDeploy = (name: string) => `Successfully deployed '${name}'.`;
  static readonly StartPostLocalDebug = (name: string) => `Starting local debug '${name}'.`;
  static readonly SkipBuild = () => "Nothing to build; no changes detected since last build.";
  static readonly SkipDeploy = () =>
    "Nothing to deploy; no changes detected since last deployment.";
  static readonly StartCheckResourceGroupExistence = (name: string) =>
    `Checking resource group '${name}'.`;
  static readonly StartCheckStaticWebsiteEnabled = (name: string) =>
    `Checking if static website feature is enabled in Azure Storage account '${name}'.`;
  static readonly StartCreateStorageAccount = (name: string, resourceGroupName: string) =>
    `Creating Azure Storage account '${name}' in resource group '${resourceGroupName}'.`;
  static readonly StartEnableStaticWebsite = (name: string) =>
    `Enabling static website feature for Azure Storage account '${name}'.`;
  static readonly SkipEnableStaticWebsite = (name: string) =>
    `Static website feature is already enabled for Azure Storage account ${name}.`;
  static readonly StartSyncLocalToStorage = (localPath: string, storageName: string) =>
    `Uploading local path '${localPath}' to Azure Storage account '${storageName}'.`;
  static readonly StartDeleteAllBlobs = (storageName: string, containerName: string) =>
    `Deleting all existing blobs in container '${containerName}') for Azure Storage account '${storageName}'.`;
  static readonly StartUploadFiles = (sourceFolder: string, storageName: string) =>
    `Uploading files in '${sourceFolder}' to Azure Storage account '${storageName}'.`;

  static readonly FailedFetchManifest = (url: string) =>
    `Failed to retrieve manifest from '${url}'. Retrying...`;
  static readonly FailedFetchZip = (url: string) =>
    `Failed to retrieve zip package from '${url}'. Retrying...`;
  static readonly FailedFetchTemplate = () =>
    "Failed to retrieve latest template from GitHub. Using local template instead.";

  static readonly FailedOperationWithErrorCode = (doOperation: string, errorCode?: string) =>
    `Failed to '${doOperation}' with error code '${errorCode}'.`;
  static readonly GetEmptyStorageEndpoint = () =>
    "Failed to retrieve endpoint for Azure Storage account.";
  static readonly GetEmptySasToken = () =>
    "Failed to retrieve SAS token for Azure Storage account.";
}
