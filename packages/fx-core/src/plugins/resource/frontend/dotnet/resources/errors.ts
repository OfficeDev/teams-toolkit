// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger } from "../../utils/logger";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { FrontendPluginError } from "../../resources/errors";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";

export enum ErrorType {
  User,
  System,
}

const tips = {
  checkLog: getLocalizedString("plugins.dotnet.checkLog"),
  doProvision: getLocalizedString("plugins.dotnet.doProvision"),
  reProvision: getLocalizedString("plugins.dotnet.reProvision"),
  reDeploy: getLocalizedString("plugins.dotnet.reDeploy"),
  checkNetwork: getLocalizedString("plugins.dotnet.checkNetwork"),
  checkFsPermissions: getLocalizedString("plugins.dotnet.checkFsPermissions"),
  restoreEnvironment: getLocalizedString(
    "plugins.dotnet.restoreEnvironment",
    `.${ConfigFolderName}`
  ),
};

export class DotnetPluginError extends FrontendPluginError {
  public innerError?: Error;

  constructor(
    errorType: ErrorType,
    code: string,
    messages: [string, string],
    suggestions: string[],
    helpLink?: string,
    innerError?: Error
  ) {
    super(errorType, code, messages, suggestions, helpLink);
    this.innerError = innerError;
  }

  getMessage(): string {
    return `${this.messages[0]} Suggestions: ${this.suggestions.join(" ")}`;
  }
  getDefaultMessage(): string {
    return `${this.messages[1]} Suggestions: ${this.suggestions.join(" ")}`;
  }
  setInnerError(error: Error): void {
    this.innerError = error;
  }

  getInnerError(): Error | undefined {
    return this.innerError;
  }
}

export class NoProjectSettingError extends DotnetPluginError {
  constructor() {
    super(
      ErrorType.System,
      "NoProjectSettingError",
      [
        getDefaultString("error.dotnet.NoProjectSettingError"),
        getLocalizedString("error.dotnet.NoProjectSettingError"),
      ],
      []
    );
  }
}

export class FetchConfigError extends DotnetPluginError {
  constructor(key: string) {
    super(
      ErrorType.User,
      "FetchConfigError",
      [
        getDefaultString("error.dotnet.FetchConfigError", key),
        getLocalizedString("error.dotnet.FetchConfigError", key),
      ],
      [tips.restoreEnvironment]
    );
  }
}

export class ProjectPathError extends DotnetPluginError {
  constructor(projectFilePath: string) {
    super(
      ErrorType.User,
      "ProjectPathError",
      [
        getDefaultString("error.dotnet.ProjectPathError", projectFilePath),
        getLocalizedString("error.dotnet.ProjectPathError", projectFilePath),
      ],
      [tips.checkLog, tips.restoreEnvironment]
    );
  }
}

export class BuildError extends DotnetPluginError {
  constructor(innerError?: Error) {
    super(
      ErrorType.User,
      "BuildError",
      [getDefaultString("error.dotnet.BuildError"), getLocalizedString("error.dotnet.BuildError")],
      [tips.checkLog, tips.reDeploy],
      undefined,
      innerError
    );
  }
}

export class ZipError extends DotnetPluginError {
  constructor() {
    super(
      ErrorType.User,
      "ZipError",
      [getDefaultString("error.dotnet.ZipError"), getLocalizedString("error.dotnet.ZipError")],
      [tips.checkFsPermissions, tips.reDeploy]
    );
  }
}

export class PublishCredentialError extends DotnetPluginError {
  constructor() {
    super(
      ErrorType.User,
      "PublishCredentialError",
      [
        getDefaultString("error.dotnet.PublishCredentialError"),
        getLocalizedString("error.dotnet.PublishCredentialError"),
      ],
      [tips.doProvision, tips.reDeploy]
    );
  }
}

export class UploadZipError extends DotnetPluginError {
  constructor() {
    super(
      ErrorType.User,
      "UploadZipError",
      [
        getDefaultString("error.dotnet.UploadZipError"),
        getLocalizedString("error.dotnet.UploadZipError"),
      ],
      [tips.checkNetwork, tips.reDeploy]
    );
  }
}

export class FileIOError extends DotnetPluginError {
  constructor(path: string) {
    super(
      ErrorType.User,
      "FileIOError",
      [
        getDefaultString("error.dotnet.FileIOError", path),
        getLocalizedString("error.dotnet.FileIOError", path),
      ],
      [tips.checkFsPermissions, tips.checkLog]
    );
  }
}

export const UnhandledErrorCode = "UnhandledError";
export const UnhandledErrorMessage = getLocalizedString("error.dotnet.UnhandledError");

export async function runWithErrorCatchAndThrow<T>(
  error: DotnetPluginError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    return await Promise.resolve(fn());
  } catch (e: any) {
    Logger.error(e.toString());
    error.setInnerError(e);
    throw error;
  }
}

export async function runWithErrorCatchAndWrap<T>(
  wrap: (error: any) => DotnetPluginError,
  fn: () => T | Promise<T>
): Promise<T> {
  try {
    return await Promise.resolve(fn());
  } catch (e: any) {
    Logger.error(e.toString());
    const error = wrap(e);
    error.setInnerError(e);
    throw error;
  }
}
