// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { PathConstants } from "../../constants";
import { ProgressMessages } from "../../messages";

export class Messages {
  static readonly SkipBuild =
    "Skip building Tab frontend project because no change was detected since last build.";
  static readonly SkipDeploy = `Skip deployment of Tab frontend project because no change was detected. To fully redeploy Tab frontend project, please remove '${path.join(
    PathConstants.tabWorkingDir,
    PathConstants.deploymentInfoFolder
  )}' folder and rerun the command.`;

  static readonly StartCheckStaticWebsiteEnabled = (name: string): string =>
    `Checking if static website feature is enabled in Azure Storage account '${name}'.`;
  static readonly StartEnableStaticWebsite = (name: string): string =>
    `Enabling static website feature for Azure Storage account '${name}'.`;
  static readonly SkipEnableStaticWebsite = (name: string): string =>
    `Static website feature is already enabled for Azure Storage account ${name}.`;
  static readonly StartSyncLocalToStorage = (localPath: string, storageName: string): string =>
    `Uploading local path '${localPath}' to Azure Storage account '${storageName}'.`;
  static readonly StartDeleteAllBlobs = (storageName: string, containerName: string): string =>
    `Deleting all existing blobs in container '${containerName}' for Azure Storage account '${storageName}'.`;
  static readonly StartUploadFiles = (sourceFolder: string, storageName: string): string =>
    `Uploading files in '${sourceFolder}' to Azure Storage account '${storageName}'.`;

  static readonly FailedOperationWithErrorCode = (
    doOperation: string,
    errorCode?: string
  ): string => `Failed to '${doOperation}' with error code '${errorCode}'.`;
  static readonly GetEmptySasToken = "Failed to retrieve SAS token for Azure Storage account.";
}

export const Progress = [
  ProgressMessages.getDeploymentSrcAndDest,
  ProgressMessages.clearStorageAccount,
  ProgressMessages.uploadTabToStorage,
];
