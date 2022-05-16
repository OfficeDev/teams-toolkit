// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { ConfigFolderName, FxError, SystemError, UserError } from "@microsoft/teamsfx-api";

import { FunctionPluginPathInfo as PathInfo } from "../constants";
import { Logger } from "../utils/logger";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

export enum ErrorType {
  User,
  System,
}

export const tips = {
  recoverTeamsFxConfigFiles: getLocalizedString(
    "plugins.function.recoverTeamsFxConfigFilesTip",
    ConfigFolderName
  ),
  recreateProject: getLocalizedString("plugins.function.recreateProject"),
  checkNetwork: getLocalizedString("plugins.function.checkNetwork"),
  retryRequest: getLocalizedString("plugins.function.retryRequest"),
  chooseAnotherCompose: getLocalizedString("plugins.function.chooseAnotherCompose"),
  checkDiskLock: getLocalizedString("plugins.function.checkDiskLock"),
  checkPathAccess: getLocalizedString("plugins.function.checkPathAccess"),
  checkSubscriptionId: getLocalizedString("plugins.function.checkSubscriptionId"),
  checkCredit: getLocalizedString("plugins.function.checkCredit"),
  checkLog: getLocalizedString("plugins.function.checkLog"),
  recreateStorageAccount: getLocalizedString("plugins.function.recreateStorageAccount"),
  checkPackageJson: getLocalizedString("plugins.function.checkPackageJson"),
  checkCredential: getLocalizedString("plugins.function.checkCredential"),
  doFullDeploy: getLocalizedString(
    "plugins.function.doFullDeploy",
    path.join(PathInfo.solutionFolderName, PathInfo.funcDeploymentFolderName)
  ),
  doProvision: getLocalizedString("plugins.function.doProvision"),
  retryRequestForZip: getLocalizedString("plugins.function.retryRequestForZip"),
  checkFunctionExtVersion: getLocalizedString(
    "plugins.function.checkFunctionExtVersion",
    path.join(PathInfo.solutionFolderName, PathInfo.functionExtensionsFileName)
  ),
};

export class FunctionPluginError extends Error {
  public code: string;
  public messages: [string, string];
  public suggestions: string[];
  public errorType: ErrorType;

  constructor(
    errorType: ErrorType,
    code: string,
    messages: [string, string],
    suggestions: string[]
  ) {
    super(messages[0]);
    this.code = code;
    this.messages = messages;
    this.suggestions = suggestions;
    this.errorType = errorType;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  getMessage(): string {
    return getLocalizedString(
      "plugins.baseErrorMessage",
      this.messages[1],
      this.suggestions.join(" ")
    );
  }
  getDefaultMessage(): string {
    return getDefaultString(
      "plugins.baseErrorMessage",
      this.messages[0],
      this.suggestions.join(" ")
    );
  }
}

export class FunctionNameConflictError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "FunctionNameConflictError",
      [
        getDefaultString("error.function.FunctionNameConflictError"),
        getLocalizedString("error.function.FunctionNameConflictError"),
      ],
      [tips.checkLog]
    );
  }
}

export class FetchConfigError extends FunctionPluginError {
  constructor(key: string) {
    super(
      ErrorType.User,
      "FetchConfigError",
      [
        getDefaultString("error.function.FetchConfigError", key),
        getLocalizedString("error.function.FetchConfigError", key),
      ],
      [tips.recoverTeamsFxConfigFiles, tips.recreateProject]
    );
  }
}

export class ValidationError extends FunctionPluginError {
  constructor(key: string) {
    super(
      ErrorType.User,
      "ValidationError",
      [
        getDefaultString("error.function.ValidationError", key),
        getLocalizedString("error.function.ValidationError", key),
      ],
      [tips.recoverTeamsFxConfigFiles, tips.recreateProject]
    );
  }
}

export class TemplateZipNetworkError extends FunctionPluginError {
  constructor(url: string) {
    super(
      ErrorType.User,
      "TemplateZipNetworkError",
      [
        getDefaultString("error.function.TemplateZipNetworkError", url),
        getLocalizedString("error.function.TemplateZipNetworkError", url),
      ],
      [tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class TemplateZipFallbackError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "TemplateZipFallbackError",
      [
        getDefaultString("error.function.TemplateZipFallbackError"),
        getLocalizedString("error.function.TemplateZipFallbackError"),
      ],
      [tips.checkLog, tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class UnzipError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UnzipError",
      [
        getDefaultString("error.function.UnzipError"),
        getLocalizedString("error.function.UnzipError"),
      ],
      [tips.checkDiskLock, tips.checkPathAccess, tips.retryRequestForZip]
    );
  }
}

export class ConfigFunctionAppError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "ConfigFunctionAppError",
      [
        getDefaultString("error.function.ConfigFunctionAppError"),
        getLocalizedString("error.function.ConfigFunctionAppError"),
      ],
      [tips.checkSubscriptionId, tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class FunctionAppOpError extends FunctionPluginError {
  constructor(op: string) {
    super(
      ErrorType.User,
      "RestartFunctionAppError",
      [
        getDefaultString("error.function.FunctionAppOpError", op),
        getLocalizedString("error.function.FunctionAppOpError", op),
      ],
      [tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class InstallTeamsFxBindingError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InstallTeamsFxBindingError",
      [
        getDefaultString("error.function.InstallTeamsFxBindingError"),
        getLocalizedString("error.function.InstallTeamsFxBindingError"),
      ],
      [tips.checkFunctionExtVersion]
    );
  }
}

export class InstallNpmPackageError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InstallNpmPackageError",
      [
        getDefaultString("error.function.InstallNpmPackageError"),
        getLocalizedString("error.function.InstallNpmPackageError"),
      ],
      [tips.checkPackageJson]
    );
  }
}

export class InitAzureSDKError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InitAzureSDKError",
      [
        getDefaultString("error.function.InitAzureSDKError"),
        getLocalizedString("error.function.InitAzureSDKError"),
      ],
      [tips.checkCredential, tips.checkSubscriptionId]
    );
  }
}

export class ZipError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "ZipError",
      [getDefaultString("error.function.ZipError"), getLocalizedString("error.function.ZipError")],
      [tips.checkDiskLock, tips.checkPathAccess, tips.doFullDeploy]
    );
  }
}

export class PublishCredentialError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "PublishCredentialError",
      [
        getDefaultString("error.function.PublishCredentialError"),
        getLocalizedString("error.function.PublishCredentialError"),
      ],
      [
        tips.checkCredential,
        tips.checkSubscriptionId,
        tips.checkNetwork,
        tips.retryRequest,
        tips.doProvision,
      ]
    );
  }
}

export class FindAppError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.System,
      "FindAppError",
      [
        getDefaultString("error.function.FindAppError"),
        getLocalizedString("error.function.FindAppError"),
      ],
      [tips.doProvision]
    );
  }
}

export class UploadZipError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UploadZipError",
      [
        getDefaultString("error.function.UploadZipError"),
        getLocalizedString("error.function.UploadZipError"),
      ],
      [tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class UnknownFallbackError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.System,
      "UnknownFallbackError",
      [
        getDefaultString("error.function.UnknownFallbackError"),
        getLocalizedString("error.function.UnknownFallbackError"),
      ],
      [tips.checkLog]
    );
  }
}

export async function runWithErrorCatchAndThrow<T>(
  error: FunctionPluginError | FxError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await Promise.resolve(fn());
    return res;
  } catch (e) {
    if (e instanceof UserError || e instanceof SystemError) {
      throw e;
    }
    Logger.error(e.toString());
    throw error;
  }
}

export async function runWithErrorCatchAndWrap<T>(
  wrap: (error: any) => FunctionPluginError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await Promise.resolve(fn());
    return res;
  } catch (e) {
    if (e instanceof UserError || e instanceof SystemError) {
      throw e;
    }
    Logger.error(e.toString());
    const error = wrap(e);
    throw error;
  }
}
