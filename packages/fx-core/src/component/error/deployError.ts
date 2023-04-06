// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HttpStatusCode } from "../constant/commonConstant";
import { DeployConstant } from "../constant/deployConstant";
import { ExternalApiCallError } from "./componentError";

/**
 * call external api error when deploy
 */
export class DeployExternalApiCallError extends ExternalApiCallError {
  static zipDeployError(
    e?: unknown,
    statusCode?: number,
    helpLink?: string
  ): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "ZipDeployError",
      "plugins.bot.FailedDeployZipFile",
      statusCode ?? -1,
      undefined,
      undefined,
      undefined,
      helpLink
    );
  }

  static zipDeployWithRemoteError(
    e?: unknown,
    statusCode?: number,
    helpLink?: string
  ): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "ZipDeployError",
      "driver.deploy.error.deployToAzureRemoteFailed",
      statusCode ?? -1,
      undefined,
      ["driver.common.suggestion.retryLater"],
      JSON.stringify(e),
      helpLink
    );
  }

  static deployStatusError(
    e?: unknown,
    statusCode?: number,
    helpLink?: string
  ): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "DeployStatusError",
      // eslint-disable-next-line no-secrets/no-secrets
      "plugins.bot.FailedCheckDeployStatus",
      statusCode ?? -1,
      undefined,
      undefined,
      JSON.stringify(e),
      helpLink
    );
  }

  static deployRemoteStatusError(e: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "DeployStatusError",
      "driver.deploy.zipDeploymentRemoteStartError",
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      undefined,
      ["driver.common.suggestion.retryLater"],
      JSON.stringify(e)
    );
  }

  static clearStorageError(
    operateName: string,
    errorCode: string | undefined,
    error: unknown,
    helpLink?: string
  ): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "ClearStorageError",
      "error.frontend.ClearStorageError",
      -1,
      [operateName, errorCode?.toString() ?? ""],
      ["plugins.frontend.checkSystemTimeTip", "plugins.frontend.checkNetworkTip"],
      typeof error === "string" ? error : JSON.stringify(error),
      helpLink
    );
  }

  static clearStorageRemoteError(statusCode?: number, error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "ClearStorageRemoteError",
      "driver.deploy.ClearStorageRemoteError",
      statusCode ?? -1,
      undefined,
      ["plugins.frontend.checkSystemTimeTip", "driver.common.suggestion.retryLater"],
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }

  static uploadToStorageError(
    path: string,
    error?: unknown,
    helpLink?: string
  ): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "UploadToStorageError",
      "error.frontend.UploadToStorageError",
      -1,
      [path],
      ["plugins.frontend.checkSystemTimeTip", "plugins.frontend.checkNetworkTip"],
      typeof error === "string" ? error : JSON.stringify(error),
      helpLink
    );
  }

  static uploadToStorageRemoteError(path: string, error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "UploadToStorageRemoteError",
      "driver.deploy.UploadToStorageRemoteError",
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      [path],
      ["plugins.frontend.checkSystemTimeTip", "driver.common.suggestion.retryLater"],
      JSON.stringify(error)
    );
  }

  static getStorageContainerError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "GetStorageContainerError",
      "driver.deploy.getStorageContainerError",
      -1,
      [DeployConstant.AZURE_STORAGE_CONTAINER_NAME],
      [
        "plugins.frontend.checkSystemTimeTip",
        // eslint-disable-next-line no-secrets/no-secrets
        "plugins.frontend.checkStoragePermissionsTip",
        "plugins.frontend.checkNetworkTip",
      ],
      JSON.stringify(error)
    );
  }

  static getStorageContainerRemoteError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "GetStorageContainerRemoteError",
      "driver.deploy.GetStorageContainerRemoteError",
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      [DeployConstant.AZURE_STORAGE_CONTAINER_NAME],
      ["driver.common.suggestion.retryLater"],
      JSON.stringify(error)
    );
  }

  static checkContainerStaticWebsiteError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "CheckContainerStaticWebsiteError",
      "driver.deploy.checkContainerStaticWebsiteError",
      -1,
      [DeployConstant.AZURE_STORAGE_CONTAINER_NAME],
      [
        "plugins.frontend.checkSystemTimeTip",
        // eslint-disable-next-line no-secrets/no-secrets
        "plugins.frontend.checkStoragePermissionsTip",
        "plugins.frontend.checkNetworkTip",
      ],
      JSON.stringify(error)
    );
  }

  static checkContainerStaticWebsiteRemoteError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "checkContainerStaticWebsiteRemoteError",
      "driver.deploy.checkContainerStaticWebsiteRemoteError",
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      [DeployConstant.AZURE_STORAGE_CONTAINER_NAME],
      [
        "driver.common.suggestion.retryLater",
        "plugins.frontend.checkSystemTimeTip",
        // eslint-disable-next-line no-secrets/no-secrets
        "plugins.frontend.checkStoragePermissionsTip",
      ],
      JSON.stringify(error)
    );
  }

  static enableContainerStaticWebsiteError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "EnableContainerStaticWebsiteError",
      "driver.deploy.enableStaticWebsiteError",
      -1,
      [DeployConstant.AZURE_STORAGE_CONTAINER_NAME],
      [
        "plugins.frontend.checkSystemTimeTip",
        // eslint-disable-next-line no-secrets/no-secrets
        "plugins.frontend.checkStoragePermissionsTip",
        "plugins.frontend.checkNetworkTip",
      ],
      JSON.stringify(error)
    );
  }

  static enableContainerStaticWebsiteRemoteError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "EnableContainerStaticWebsiteRemoteError",
      "driver.deploy.enableStaticWebsiteRemoteError",
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      [DeployConstant.AZURE_STORAGE_CONTAINER_NAME],
      [
        "driver.common.suggestion.retryLater",
        "plugins.frontend.checkSystemTimeTip",
        // eslint-disable-next-line no-secrets/no-secrets
        "plugins.frontend.checkStoragePermissionsTip",
      ],
      JSON.stringify(error)
    );
  }
}
