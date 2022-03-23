// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants, FrontendPathInfo, FrontendPluginInfo } from "../constants";
import { Logger } from "../utils/logger";
import path from "path";
import { ConfigFolderName, FxError } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";

export enum ErrorType {
  User,
  System,
}

export const tips = {
  checkLog: getLocalizedString("plugins.frontend.checkLogTip"),
  reScaffold: getLocalizedString("plugins.frontend.reScaffoldTip"),
  doProvision: getLocalizedString("plugins.frontend.doProvisionTip"),
  doLogin: getLocalizedString("plugins.frontend.doLoginTip"),
  reLogin: getLocalizedString("plugins.frontend.reLoginTip"),
  reProvision: getLocalizedString("plugins.frontend.reProvisionTip"),
  doNpmInstall: getLocalizedString("plugins.frontend.doNpmInstallTip", FrontendPathInfo.WorkingDir),
  doBuild: getLocalizedString("plugins.frontend.doBuildTip", FrontendPathInfo.WorkingDir),
  ensureBuildPath: getLocalizedString(
    "plugins.frontend.ensureBuildPathTip",
    FrontendPathInfo.BuildFolderName
  ),
  ensureResourceGroup: getLocalizedString("plugins.frontend.ensureResourceGroupTip"),
  ensureAppNameValid: getLocalizedString("plugins.frontend.ensureAppNameValidTip"),
  deleteSameNameStorage: getLocalizedString("plugins.frontend.deleteSameNameStorageTip"),
  checkNetwork: getLocalizedString("plugins.frontend.checkNetworkTip"),
  checkFsPermissions: getLocalizedString("plugins.frontend.checkFsPermissionsTip"),
  checkStoragePermissions: getLocalizedString("plugins.frontend.checkStoragePermissionsTip"),
  checkSystemTime: getLocalizedString("plugins.frontend.checkSystemTimeTip"),
  restoreEnvironment: getLocalizedString(
    "plugins.frontend.restoreEnvironmentTip",
    ConfigFolderName
  ),
};

export class ErrorMessages {
  static readonly FailedSaveEnv = (envPath: string) =>
    getLocalizedString("error.frontend.FailedSaveEnv", envPath);
  static readonly FailedLoadEnv = (envPath: string) =>
    getLocalizedString("error.frontend.FailedLoadEnv", envPath);
}

export class FrontendPluginError extends Error {
  public code: string;
  public message: string;
  public suggestions: string[];
  public errorType: ErrorType;
  public helpLink?: string;
  public innerError?: Error;

  constructor(
    errorType: ErrorType,
    code: string,
    message: string,
    suggestions: string[],
    helpLink?: string
  ) {
    super(message);
    this.code = code;
    this.message = message;
    this.suggestions = suggestions;
    this.errorType = errorType;
    this.helpLink = helpLink;
  }

  getMessage(): string {
    return getLocalizedString("plugins.baseErrorMessage", this.message, this.suggestions.join(" "));
  }

  setInnerError(error: Error): void {
    this.innerError = error;
  }

  getInnerError(): Error | undefined {
    return this.innerError;
  }
}

export class UnauthenticatedError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UnauthenticatedError",
      getLocalizedString("error.frontend.UnauthenticatedError"),
      [tips.doLogin]
    );
  }
}

export class InvalidConfigError extends FrontendPluginError {
  constructor(key: string, detailedErrorMessage?: string) {
    const detailedMsg = detailedErrorMessage ?? "";
    super(
      ErrorType.User,
      "InvalidConfigError",
      `${getLocalizedString("error.frontend.InvalidConfigError", key)}${detailedMsg}`,
      [tips.restoreEnvironment]
    );
  }
}

export class CheckResourceGroupError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "CheckResourceGroupError",
      getLocalizedString("error.frontend.CheckResourceGroupError"),
      [tips.checkLog]
    );
  }
}

export class NoResourceGroupError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "NoResourceGroupError",
      getLocalizedString("error.frontend.NoResourceGroupError"),
      [tips.ensureResourceGroup]
    );
  }
}

export class CheckStorageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "CheckStorageError",
      getLocalizedString("error.frontend.CheckStorageError"),
      [tips.checkSystemTime, tips.checkLog]
    );
  }
}

export class NoStorageError extends FrontendPluginError {
  constructor() {
    super(ErrorType.User, "NoStorageError", getLocalizedString("error.frontend.NoStorageError"), [
      tips.reProvision,
    ]);
  }
}

export class StaticWebsiteDisabledError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "StaticWebsiteDisableError",
      getLocalizedString("error.frontend.StaticWebsiteDisabledError"),
      [tips.reProvision],
      FrontendPluginInfo.HelpLink
    );
  }
}

export class InvalidStorageNameError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InvalidStorageNameError",
      getLocalizedString("error.frontend.InvalidStorageNameError"),
      [tips.ensureAppNameValid]
    );
  }
}

export class EnableStaticWebsiteError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "EnableStaticWebsiteError",
      getLocalizedString("error.frontend.EnableStaticWebsiteError"),
      [tips.checkSystemTime, tips.checkStoragePermissions],
      FrontendPluginInfo.HelpLink
    );
  }
}

export class ClearStorageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "ClearStorageError",
      getLocalizedString("error.frontend.ClearStorageError"),
      [tips.checkSystemTime, tips.checkNetwork]
    );
  }
}

export class UploadToStorageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UploadToStorageError",
      getLocalizedString(
        "error.frontend.UploadToStorageError",
        path.join(FrontendPathInfo.WorkingDir, FrontendPathInfo.BuildPath)
      ),
      [tips.checkSystemTime, tips.checkNetwork]
    );
  }
}

export class GetContainerError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "GetContainerError",
      getLocalizedString("error.frontend.GetContainerError", Constants.AzureStorageWebContainer),
      [tips.checkSystemTime, tips.checkStoragePermissions, tips.checkNetwork]
    );
  }
}

export class UnknownScaffoldError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.System,
      "UnknownScaffoldError",
      getLocalizedString("error.frontend.UnknownScaffoldError"),
      [tips.checkLog]
    );
  }
}

export class TemplateZipFallbackError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.System,
      "TemplateZipFallbackError",
      getLocalizedString("error.frontend.TemplateZipFallbackError"),
      [tips.checkLog, tips.checkNetwork]
    );
  }
}

export class UnzipTemplateError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UnzipTemplateError",
      getLocalizedString("error.frontend.UnzipTemplateError"),
      [tips.checkFsPermissions]
    );
  }
}

export class FileSystemError extends FrontendPluginError {
  constructor(message: string) {
    super(ErrorType.System, "FileSystemError", message, [tips.checkLog]);
  }
}

export class NoBuildPathError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "NoBuildPathError",
      getLocalizedString("error.frontend.NoBuildPathError", FrontendPathInfo.BuildFolderName),
      [tips.doBuild, tips.ensureBuildPath]
    );
  }
}

export class BuildError extends FrontendPluginError {
  constructor() {
    super(ErrorType.User, "BuildError", getLocalizedString("error.frontend.BuildError"), [
      tips.doBuild,
      tips.checkLog,
    ]);
  }
}

export class NpmInstallError extends FrontendPluginError {
  constructor() {
    super(ErrorType.User, "NpmInstallError", getLocalizedString("error.frontend.NpmInstallError"), [
      tips.doNpmInstall,
      tips.checkLog,
    ]);
  }
}

export class InvalidTabLanguageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InvalidTabLanguageError",
      getLocalizedString("error.frontend.InvalidTabLanguageError"),
      [tips.restoreEnvironment, tips.reScaffold]
    );
  }
}

export class NotImplemented extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.System,
      "NotImplemented",
      getLocalizedString("error.frontend.NotImplemented"),
      []
    );
  }
}

export const UnhandledErrorCode = "UnhandledError";
export const UnhandledErrorMessage = getLocalizedString("error.frontend.UnhandledError");

export async function runWithErrorCatchAndThrow<T>(
  error: FrontendPluginError | FxError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await Promise.resolve(fn());
    return res;
  } catch (e) {
    Logger.error(e.toString());
    if (error instanceof FrontendPluginError) error.setInnerError(e);
    throw error;
  }
}

export async function runWithErrorCatchAndWrap<T>(
  wrap: (error: any) => FrontendPluginError | FxError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await Promise.resolve(fn());
    return res;
  } catch (e) {
    Logger.error(e.toString());
    const error = wrap(e);
    if (error instanceof FrontendPluginError) error.setInnerError(e);
    throw error;
  }
}
