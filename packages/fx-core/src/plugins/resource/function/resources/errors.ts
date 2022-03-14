// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { ConfigFolderName, FxError, SystemError, UserError } from "@microsoft/teamsfx-api";

import { AzureInfo, FunctionPluginPathInfo as PathInfo } from "../constants";
import { Logger } from "../utils/logger";
import { getLocalizedString } from "../../../../common/localizeUtils";

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
  chooseAnotherCompose: getLocalizedString("Create a project with another template."),
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
  public message: string;
  public suggestions: string[];
  public errorType: ErrorType;

  constructor(errorType: ErrorType, code: string, message: string, suggestions: string[]) {
    super(message);
    this.code = code;
    this.message = message;
    this.suggestions = suggestions;
    this.errorType = errorType;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  getMessage(): string {
    return `${this.message} Suggestions: ${this.suggestions.join(" ")}`;
  }
}

export class FunctionNameConflictError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "FunctionNameConflictError",
      getLocalizedString("error.function.FunctionNameConflictError"),
      [tips.checkLog]
    );
  }
}

export class FetchConfigError extends FunctionPluginError {
  constructor(key: string) {
    super(
      ErrorType.User,
      "FetchConfigError",
      getLocalizedString("error.function.FetchConfigError", key),
      [tips.recoverTeamsFxConfigFiles, tips.recreateProject]
    );
  }
}

export class ValidationError extends FunctionPluginError {
  constructor(key: string) {
    super(
      ErrorType.User,
      "ValidationError",
      getLocalizedString("error.function.ValidationError", key),
      [tips.recoverTeamsFxConfigFiles, tips.recreateProject]
    );
  }
}

export class TemplateManifestError extends FunctionPluginError {
  constructor(msg: string) {
    super(
      ErrorType.User,
      "TemplateManifestError",
      `Failed to find template from manifest: ${msg}.`,
      [tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class TemplateZipNetworkError extends FunctionPluginError {
  constructor(url: string) {
    super(
      ErrorType.User,
      "TemplateZipNetworkError",
      getLocalizedString("error.function.TemplateZipNetworkError", url),
      [tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class TemplateZipFallbackError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "TemplateZipFallbackError",
      getLocalizedString("error.function.TemplateZipFallbackError"),
      [tips.checkLog, tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class UnzipError extends FunctionPluginError {
  constructor() {
    super(ErrorType.User, "UnzipError", getLocalizedString("error.function.UnzipError"), [
      tips.checkDiskLock,
      tips.checkPathAccess,
      tips.retryRequestForZip,
    ]);
  }
}

export class ConfigFunctionAppError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "ConfigFunctionAppError",
      getLocalizedString("error.function.ConfigFunctionAppError"),
      [tips.checkSubscriptionId, tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class FunctionAppOpError extends FunctionPluginError {
  constructor(op: string) {
    super(
      ErrorType.User,
      "RestartFunctionAppError",
      getLocalizedString("error.function.FunctionAppOpError", op),
      [tips.checkNetwork, tips.retryRequest]
    );
  }
}

export class InstallTeamsFxBindingError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InstallTeamsFxBindingError",
      getLocalizedString("error.function.InstallTeamsFxBindingError"),
      [tips.checkFunctionExtVersion]
    );
  }
}

export class InstallNpmPackageError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InstallNpmPackageError",
      getLocalizedString("error.function.InstallNpmPackageError"),
      [tips.checkPackageJson]
    );
  }
}

export class InitAzureSDKError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InitAzureSDKError",
      getLocalizedString("error.function.InitAzureSDKError"),
      [tips.checkCredential, tips.checkSubscriptionId]
    );
  }
}

export class ZipError extends FunctionPluginError {
  constructor() {
    super(ErrorType.User, "ZipError", getLocalizedString("error.functionZipError"), [
      tips.checkDiskLock,
      tips.checkPathAccess,
      tips.doFullDeploy,
    ]);
  }
}

export class PublishCredentialError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.User,
      "PublishCredentialError",
      getLocalizedString("error.function.PublishCredentialError"),
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
    super(ErrorType.System, "FindAppError", getLocalizedString("error.function.FindAppError"), [
      tips.doProvision,
    ]);
  }
}

export class UploadZipError extends FunctionPluginError {
  constructor() {
    super(ErrorType.User, "UploadZipError", getLocalizedString("error.function.UploadZipError"), [
      tips.checkNetwork,
      tips.retryRequest,
    ]);
  }
}

export class UnknownFallbackError extends FunctionPluginError {
  constructor() {
    super(
      ErrorType.System,
      "UnknownFallbackError",
      getLocalizedString("error.function.UnknownFallbackError"),
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
