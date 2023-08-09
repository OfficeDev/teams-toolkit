// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { BlobDeleteResponse, BlobUploadCommonResponse } from "@azure/storage-blob";

export class DeployEmptyFolderError extends UserError {
  constructor(folderPath: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString("error.deploy.DeployEmptyFolderError", folderPath),
      displayMessage: getLocalizedString("error.deploy.DeployEmptyFolderError", folderPath),
    });
  }
}

export class CheckDeploymentStatusTimeoutError extends UserError {
  constructor(helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString("error.deploy.CheckDeploymentStatusTimeoutError"),
      displayMessage: getLocalizedString("error.deploy.CheckDeploymentStatusTimeoutError"),
      helpLink: helpLink,
    });
  }
}

export class GetPublishingCredentialsError extends UserError {
  constructor(appName: string, resourceGroup: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.GetPublishingCredentialsError",
        appName,
        resourceGroup,
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
        "https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-publishing-credentials#code-try-0"
      ),
      displayMessage: getLocalizedString(
        "error.deploy.GetPublishingCredentialsError.Notification",
        appName,
        resourceGroup
      ),
      helpLink: helpLink,
    });
  }
}

export class DeployZipPackageError extends UserError {
  constructor(endpoint: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.DeployZipPackageError",
        endpoint,
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
        "https://learn.microsoft.com/azure/app-service/deploy-zip?tabs=cli"
      ),
      displayMessage: getLocalizedString(
        "error.deploy.DeployZipPackageError.Notification",
        endpoint
      ),
      helpLink: helpLink,
    });
  }
}

export class CheckDeploymentStatusError extends UserError {
  constructor(location: string, error: Error, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.CheckDeploymentStatusError",
        location,
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      ),
      displayMessage: getLocalizedString(
        "error.deploy.CheckDeploymentStatusError",
        location,
        error.message || ""
      ),
      helpLink: helpLink,
    });
  }
}

export class AzureStorageClearBlobsError extends UserError {
  constructor(storageName: string, errorResponse: BlobDeleteResponse, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.AzureStorageClearBlobsError",
        storageName,
        JSON.stringify(errorResponse, Object.getOwnPropertyNames(errorResponse), 4)
      ),
      displayMessage: getLocalizedString(
        "error.deploy.AzureStorageClearBlobsError.Notification",
        storageName
      ),
      helpLink: helpLink,
    });
  }
}

export class AzureStorageUploadFilesError extends UserError {
  constructor(
    storageName: string,
    localFolder: string,
    errorResponse: BlobUploadCommonResponse,
    helpLink?: string
  ) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.AzureStorageUploadFilesError",
        localFolder,
        storageName,
        JSON.stringify(errorResponse, Object.getOwnPropertyNames(errorResponse), 4)
      ),
      displayMessage: getLocalizedString(
        "error.deploy.AzureStorageUploadFilesError.Notification",
        localFolder,
        storageName
      ),
      helpLink: helpLink,
    });
  }
}

export class AzureStorageGetContainerError extends UserError {
  constructor(storageName: string, containerName: string, error: any, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.AzureStorageGetContainerError",
        containerName,
        storageName,
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      ),
      displayMessage: getLocalizedString(
        "error.deploy.AzureStorageGetContainerError.Notification",
        containerName,
        storageName,
        error.message || ""
      ),
      helpLink: helpLink,
    });
  }
}

export class AzureStorageGetContainerPropertiesError extends UserError {
  constructor(storageName: string, containerName: string, error: any, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.AzureStorageGetContainerPropertiesError",
        containerName,
        storageName,
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      ),
      displayMessage: getLocalizedString(
        "error.deploy.AzureStorageGetContainerPropertiesError.Notification",
        containerName,
        storageName,
        error.message || ""
      ),
      helpLink: helpLink,
    });
  }
}

export class AzureStorageSetContainerPropertiesError extends UserError {
  constructor(storageName: string, containerName: string, error: any, helpLink?: string) {
    super({
      source: "azureDeploy",
      message: getDefaultString(
        "error.deploy.AzureStorageSetContainerPropertiesError",
        containerName,
        storageName,
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      ),
      displayMessage: getLocalizedString(
        "error.deploy.AzureStorageSetContainerPropertiesError.Notification",
        containerName,
        storageName,
        error.message || ""
      ),
      helpLink: helpLink,
    });
  }
}
