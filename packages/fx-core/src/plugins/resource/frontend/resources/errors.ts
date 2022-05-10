// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants, FrontendPathInfo, FrontendPluginInfo } from "../constants";
import { Logger } from "../utils/logger";
import path from "path";
import { ConfigFolderName, FxError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

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
  static readonly FailedSaveEnv = (envPath: string): [string, string] => [
    getDefaultString("error.frontend.FailedSaveEnv", envPath),
    getLocalizedString("error.frontend.FailedSaveEnv", envPath),
  ];
  static readonly FailedLoadEnv = (envPath: string): [string, string] => [
    getDefaultString("error.frontend.FailedLoadEnv", envPath),
    getLocalizedString("error.frontend.FailedLoadEnv", envPath),
  ];
}

export class FrontendPluginError extends Error {
  public code: string;
  public messages: [string, string];
  public suggestions: string[];
  public errorType: ErrorType;
  public helpLink?: string;
  public innerError?: Error;

  constructor(
    errorType: ErrorType,
    code: string,
    messages: [string, string],
    suggestions: string[],
    helpLink?: string
  ) {
    super(messages[0]);
    this.code = code;
    this.messages = messages;
    this.suggestions = suggestions;
    this.errorType = errorType;
    this.helpLink = helpLink;
  }

  getMessage(): string {
    return getLocalizedString(
      "plugins.baseErrorMessage",
      this.messages[0],
      this.suggestions.join(" ")
    );
  }
  getDefaultMessage(): string {
    return getDefaultString(
      "plugins.baseErrorMessage",
      this.messages[1],
      this.suggestions.join(" ")
    );
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
      [
        getDefaultString("error.frontend.UnauthenticatedError"),
        getLocalizedString("error.frontend.UnauthenticatedError"),
      ],
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
      [
        `${getDefaultString("error.frontend.InvalidConfigError", key)}${detailedMsg}`,
        `${getLocalizedString("error.frontend.InvalidConfigError", key)}${detailedMsg}`,
      ],
      [tips.restoreEnvironment]
    );
  }
}

export class CheckResourceGroupError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "CheckResourceGroupError",
      [
        getDefaultString("error.frontend.CheckResourceGroupError"),
        getLocalizedString("error.frontend.CheckResourceGroupError"),
      ],
      [tips.checkLog]
    );
  }
}

export class NoResourceGroupError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "NoResourceGroupError",
      [
        getDefaultString("error.frontend.NoResourceGroupError"),
        getLocalizedString("error.frontend.NoResourceGroupError"),
      ],
      [tips.ensureResourceGroup]
    );
  }
}

export class CheckStorageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "CheckStorageError",
      [
        getDefaultString("error.frontend.CheckStorageError"),
        getLocalizedString("error.frontend.CheckStorageError"),
      ],
      [tips.checkSystemTime, tips.checkLog]
    );
  }
}

export class NoStorageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "NoStorageError",
      [
        getDefaultString("error.frontend.NoStorageError"),
        getLocalizedString("error.frontend.NoStorageError"),
      ],
      [tips.reProvision]
    );
  }
}

export class StaticWebsiteDisabledError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "StaticWebsiteDisableError",
      [
        getDefaultString("error.frontend.StaticWebsiteDisabledError"),
        getLocalizedString("error.frontend.StaticWebsiteDisabledError"),
      ],
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
      [
        getDefaultString("error.frontend.InvalidStorageNameError"),
        getLocalizedString("error.frontend.InvalidStorageNameError"),
      ],
      [tips.ensureAppNameValid]
    );
  }
}

export class EnableStaticWebsiteError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "EnableStaticWebsiteError",
      [
        getDefaultString("error.frontend.EnableStaticWebsiteError"),
        getLocalizedString("error.frontend.EnableStaticWebsiteError"),
      ],
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
      [
        getDefaultString("error.frontend.ClearStorageError"),
        getLocalizedString("error.frontend.ClearStorageError"),
      ],
      [tips.checkSystemTime, tips.checkNetwork]
    );
  }
}

export class UploadToStorageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UploadToStorageError",
      [
        getDefaultString(
          "error.frontend.UploadToStorageError",
          path.join(FrontendPathInfo.WorkingDir, FrontendPathInfo.BuildPath)
        ),
        getLocalizedString(
          "error.frontend.UploadToStorageError",
          path.join(FrontendPathInfo.WorkingDir, FrontendPathInfo.BuildPath)
        ),
      ],
      [tips.checkSystemTime, tips.checkNetwork]
    );
  }
}

export class GetContainerError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "GetContainerError",
      [
        getDefaultString("error.frontend.GetContainerError", Constants.AzureStorageWebContainer),
        getLocalizedString("error.frontend.GetContainerError", Constants.AzureStorageWebContainer),
      ],
      [tips.checkSystemTime, tips.checkStoragePermissions, tips.checkNetwork]
    );
  }
}

export class UnknownScaffoldError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.System,
      "UnknownScaffoldError",
      [
        getDefaultString("error.frontend.UnknownScaffoldError"),
        getLocalizedString("error.frontend.UnknownScaffoldError"),
      ],
      [tips.checkLog]
    );
  }
}

export class TemplateZipFallbackError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.System,
      "TemplateZipFallbackError",
      [
        getDefaultString("error.frontend.TemplateZipFallbackError"),
        getLocalizedString("error.frontend.TemplateZipFallbackError"),
      ],
      [tips.checkLog, tips.checkNetwork]
    );
  }
}

export class UnzipTemplateError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UnzipTemplateError",
      [
        getDefaultString("error.frontend.UnzipTemplateError"),
        getLocalizedString("error.frontend.UnzipTemplateError"),
      ],
      [tips.checkFsPermissions]
    );
  }
}

export class FileIOError extends FrontendPluginError {
  constructor(messages: [string, string]) {
    super(ErrorType.System, "FileIOError", messages, [tips.checkLog]);
  }
}

export class NoBuildPathError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "NoBuildPathError",
      [
        getDefaultString("error.frontend.NoBuildPathError", FrontendPathInfo.BuildFolderName),
        getLocalizedString("error.frontend.NoBuildPathError", FrontendPathInfo.BuildFolderName),
      ],
      [tips.doBuild, tips.ensureBuildPath]
    );
  }
}

export class BuildError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "BuildError",
      [
        getDefaultString("error.frontend.BuildError"),
        getLocalizedString("error.frontend.BuildError"),
      ],
      [tips.doBuild, tips.checkLog]
    );
  }
}

export class NpmInstallError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "NpmInstallError",
      [
        getDefaultString("error.frontend.NpmInstallError"),
        getLocalizedString("error.frontend.NpmInstallError"),
      ],
      [tips.doNpmInstall, tips.checkLog]
    );
  }
}

export class InvalidTabLanguageError extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InvalidTabLanguageError",
      [
        getDefaultString("error.frontend.InvalidTabLanguageError"),
        getLocalizedString("error.frontend.InvalidTabLanguageError"),
      ],
      [tips.restoreEnvironment, tips.reScaffold]
    );
  }
}

export class NotImplemented extends FrontendPluginError {
  constructor() {
    super(
      ErrorType.System,
      "NotImplemented",
      [
        getDefaultString("error.frontend.NotImplemented"),
        getLocalizedString("error.frontend.NotImplemented"),
      ],
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
