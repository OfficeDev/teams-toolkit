// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError, ExternalApiCallError } from "./componentError";
import { DeployConstant } from "../constant/deployConstant";

/**
 * call external api error when deploy
 */
export class DeployExternalApiCallError extends ExternalApiCallError {
  static listPublishingCredentialsError(e?: unknown, helpLink?: string): DeployExternalApiCallError;
  static listPublishingCredentialsError(
    statusCode = -1,
    error?: unknown,
    helpLink?: string
  ): DeployExternalApiCallError {
    error = error ?? "";
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "ListPublishingCredentialsError",
      "plugins.bot.FailedListPublishingCredentials",
      statusCode ?? -1,
      undefined,
      undefined,
      typeof error === "string" ? error : JSON.stringify(error),
      helpLink
    );
  }

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
      undefined,
      undefined,
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
      helpLink
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

  static restartWebAppError(error?: unknown, helpLink?: string): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "RestartWebAppError",
      "plugins.bot.FailedRestartWebApp",
      -1,
      undefined,
      undefined,
      typeof error === "string" ? error : JSON.stringify(error),
      helpLink
    );
  }
}

/**
 * parameter in environmental error or user input error
 */
export class DeployTimeoutError extends BaseComponentInnerError {
  constructor(name: string, messageKey: string, helpLink?: string) {
    super(
      DeployConstant.DEPLOY_ERROR_TYPE,
      "UserError",
      name,
      messageKey,
      undefined,
      undefined,
      helpLink
    );
  }

  static checkDeployStatusTimeout(helpLink?: string): DeployTimeoutError {
    // eslint-disable-next-line no-secrets/no-secrets
    return new DeployTimeoutError(
      "DeployTimeoutError",
      // eslint-disable-next-line no-secrets/no-secrets
      "plugins.bot.CheckDeployStatusTimeout",
      helpLink
    );
  }
}

/**
 * user input case some logic error
 */
export class DeployUserInputError extends BaseComponentInnerError {
  constructor(name: string, messageKey: string) {
    super(DeployConstant.DEPLOY_ERROR_TYPE, "UserError", name, messageKey);
  }

  static noFilesFindInDistFolder(): DeployUserInputError {
    return new DeployUserInputError(
      "NoFilesFindInDistFolder",
      "driver.deploy.error.noFileFindInDistributionFolder"
    );
  }
}
