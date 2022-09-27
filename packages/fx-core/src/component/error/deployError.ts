// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError, ExternalApiCallError } from "./componentError";
import { DeployConstant } from "../constant/deployConstant";

/**
 * call external api error when deploy
 */
export class DeployExternalApiCallError extends ExternalApiCallError {
  static listPublishingCredentialsError(e?: unknown): DeployExternalApiCallError;
  static listPublishingCredentialsError(
    statusCode = -1,
    error?: unknown
  ): DeployExternalApiCallError {
    error = error ?? "";
    return new DeployExternalApiCallError(
      "ListPublishingCredentialsError",
      "plugins.bot.FailedListPublishingCredentials",
      statusCode ?? -1,
      undefined,
      undefined,
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }

  static zipDeployError(e?: unknown, statusCode?: number): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      "ZipDeployError",
      "plugins.bot.FailedDeployZipFile",
      statusCode ?? -1
    );
  }

  static deployStatusError(e?: unknown, statusCode?: number): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      "DeployStatusError",
      // eslint-disable-next-line no-secrets/no-secrets
      "plugins.bot.FailedCheckDeployStatus",
      statusCode ?? -1
    );
  }

  static clearStorageError(
    operateName: string,
    errorCode: string | undefined,
    error: unknown
  ): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      "ClearStorageError",
      "error.frontend.ClearStorageError",
      -1,
      [operateName, errorCode?.toString() ?? ""],
      ["plugins.frontend.checkSystemTimeTip", "plugins.frontend.checkNetworkTip"],
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }

  static uploadToStorageError(path: string, error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      "UploadToStorageError",
      "error.frontend.UploadToStorageError",
      -1,
      [path],
      ["plugins.frontend.checkSystemTimeTip", "plugins.frontend.checkNetworkTip"],
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }

  static restartWebAppError(error?: unknown): DeployExternalApiCallError {
    return new DeployExternalApiCallError(
      "RestartWebAppError",
      "plugins.bot.FailedRestartWebApp",
      -1,
      undefined,
      undefined,
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }
}

/**
 * parameter in environmental error or user input error
 */
export class DeployTimeoutError extends BaseComponentInnerError {
  constructor(name: string, messageKey: string) {
    super("UserError", name, messageKey);
  }

  static checkDeployStatusTimeout(): DeployTimeoutError {
    // eslint-disable-next-line no-secrets/no-secrets
    return new DeployTimeoutError("DeployTimeoutError", "plugins.bot.CheckDeployStatusTimeout");
  }
}
