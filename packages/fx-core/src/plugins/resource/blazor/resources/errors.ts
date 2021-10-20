// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger } from "../utils/logger";
import path from "path";
import { ConfigFolderName, ArchiveFolderName } from "@microsoft/teamsfx-api";

export enum ErrorType {
  User,
  System,
}

const tips = {
  checkLog: "Check log for more information.",
  reScaffold: `Run 'Start A New Project' again.`,
  doProvision: `Run 'Provision Resource' before this command.`,
  doLogin: "Login to Azure.",
  reLogin: "Sign out and login to Azure again.",
  reProvision: `Run 'Provision Resource' again.`,
  ensureResourceGroup: "Ensure your resource group exists.",
  ensureAppNameValid:
    "Ensure your app name only contains alphabetical and numeric characters, and does not contain trademark or reserved words.",
  deleteSameNameStorage:
    "Delete your Azure Storage Account with same name in another resource group or subscription.",
  checkNetwork: "Check your network connection.",
  checkFsPermissions: "Check if you have Read/Write permissions to your file system.",
  checkStoragePermissions: "Check if you have permissions to your Azure Storage Account.",
  checkSystemTime: "You may get expired credentials, check if your system time is correct.",
  restoreEnvironment: `If you manually updated configuration files (under directory .${ConfigFolderName}), recover them.`,
  migrateV1Project: `Rollback your project from '${ArchiveFolderName}' folder.`,
};

export class BlazorPluginError extends Error {
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
    return `${this.message} Suggestions: ${this.suggestions.join(" ")}`;
  }

  setInnerError(error: Error): void {
    this.innerError = error;
  }

  getInnerError(): Error | undefined {
    return this.innerError;
  }
}

export class UnauthenticatedError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "UnauthenticatedError", "Failed to get user login information.", [
      tips.doLogin,
    ]);
  }
}

export class NoPreStepError extends BlazorPluginError {
  constructor() {
    super(ErrorType.System, "NoPreStepError", "The pre-step is not done.", [tips.checkLog]);
  }
}

export class InvalidConfigError extends BlazorPluginError {
  constructor(key: string, detailedErrorMessage?: string) {
    const detailedMsg = detailedErrorMessage ? ` Error message: ${detailedErrorMessage}` : "";
    super(ErrorType.User, "InvalidConfigError", `Get invalid ${key}.${detailedMsg}`, [
      tips.restoreEnvironment,
    ]);
  }
}

export class CheckResourceGroupError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "CheckResourceGroupError", "Failed to check resource group existence.", [
      tips.checkLog,
    ]);
  }
}

export class NoResourceGroupError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "NoResourceGroupError", "Failed to find resource group.", [
      tips.ensureResourceGroup,
    ]);
  }
}

export class CheckStorageError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.User,
      "CheckStorageError",
      "Failed to check Azure Storage Account availability.",
      [tips.checkSystemTime, tips.checkLog]
    );
  }
}

export class NoStorageError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "NoStorageError", "Failed to find Azure Storage Account.", [
      tips.reProvision,
    ]);
  }
}

export class InvalidStorageNameError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "InvalidStorageNameError", "Azure Storage Name is invalid.", [
      tips.ensureAppNameValid,
    ]);
  }
}

export class StorageAccountAlreadyTakenError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.User,
      "StorageAccountAlreadyTakenError",
      "Azure Storage Name is already in use.",
      [tips.deleteSameNameStorage]
    );
  }
}

export class CreateStorageAccountError extends BlazorPluginError {
  constructor(innerErrorCode?: string) {
    super(
      ErrorType.User,
      "CreateStorageAccountError",
      `Failed to create Azure Storage Account${innerErrorCode ? `: ${innerErrorCode}` : ""}.`,
      [tips.checkLog]
    );
  }
}

export class ClearStorageError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "ClearStorageError", "Failed to clear Azure Storage Account.", [
      tips.checkSystemTime,
      tips.checkNetwork,
    ]);
  }
}

export class UnknownScaffoldError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.System,
      "UnknownScaffoldError",
      "Failed to scaffold project causes unknown reason.",
      [tips.checkLog]
    );
  }
}

export class TemplateManifestError extends BlazorPluginError {
  constructor(msg: string) {
    super(
      ErrorType.User,
      "TemplateManifestError ",
      `Failed to find template from manifest: ${msg}`,
      [tips.checkNetwork]
    );
  }
}

export class TemplateZipFallbackError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.System,
      "TemplateZipFallbackError",
      "Failed to download zip package and open local zip package.",
      [tips.checkLog, tips.checkNetwork]
    );
  }
}

export class UnzipTemplateError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "UnzipTemplateError", "Failed to unzip template package.", [
      tips.checkFsPermissions,
    ]);
  }
}

export class InvalidTabLanguageError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InvalidTabLanguageError",
      "The selected programming language yet is not supported by Tab.",
      [tips.restoreEnvironment, tips.reScaffold]
    );
  }
}

export class InvalidAuthPluginConfigError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InvalidAuthPluginConfigError",
      "The auth plugin configuration is invalid.",
      [tips.restoreEnvironment, tips.reProvision]
    );
  }
}

export class InvalidAadPluginConfigError extends BlazorPluginError {
  constructor() {
    super(
      ErrorType.User,
      "InvalidAadPluginConfigError",
      "The aad plugin configuration is invalid.",
      [tips.restoreEnvironment, tips.reProvision]
    );
  }
}

export class UserTaskNotImplementedError extends BlazorPluginError {
  constructor(taskName: string) {
    super(
      ErrorType.System,
      "UserTaskNotImplementedError",
      `User task '${taskName}' is not implemented.`,
      []
    );
  }
}

export const UnhandledErrorCode = "UnhandledError";
export const UnhandledErrorMessage = "Unhandled error.";

export async function runWithErrorCatchAndThrow<T>(
  error: BlazorPluginError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await Promise.resolve(fn());
    return res;
  } catch (e) {
    Logger.error(e.toString());
    error.setInnerError(e);
    throw error;
  }
}

export async function runWithErrorCatchAndWrap<T>(
  wrap: (error: any) => BlazorPluginError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await Promise.resolve(fn());
    return res;
  } catch (e) {
    Logger.error(e.toString());
    const error = wrap(e);
    error.setInnerError(e);
    throw error;
  }
}
