// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger } from "../../utils/logger";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { FrontendPluginError } from "../../resources/errors";

export enum ErrorType {
  User,
  System,
}

const tips = {
  checkLog: "Check log for more information.",
  doProvision: `Run 'Provision Resource' before this command.`,
  reProvision: `Run 'Provision' command again.`,
  reDeploy: "Run 'Deploy' command again.",
  checkNetwork: "Check your network connection.",
  checkFsPermissions: "Check if you have Read/Write permissions to your file system.",
  restoreEnvironment: `If you manually updated configuration files (under directory .${ConfigFolderName}), recover them.`,
};

export class BlazorPluginError extends FrontendPluginError {
  public innerError?: Error;

  constructor(
    errorType: ErrorType,
    code: string,
    message: string,
    suggestions: string[],
    helpLink?: string,
    innerError?: Error
  ) {
    super(errorType, code, message, suggestions, helpLink);
    this.innerError = innerError;
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

export class FetchConfigError extends BlazorPluginError {
  constructor(key: string) {
    super(ErrorType.User, "FetchConfigError", `Failed to find ${key} from configuration`, [
      tips.restoreEnvironment,
    ]);
  }
}

export class ProvisionError extends BlazorPluginError {
  constructor(resource: string, innerErrorCode?: string) {
    super(
      ErrorType.User,
      "ProvisionError",
      `Failed to check/create '${resource}' for blazor app${
        innerErrorCode ? `: ${innerErrorCode}` : ""
      }.`,
      [tips.reProvision]
    );
  }
}

export class ConfigureWebAppError extends BlazorPluginError {
  constructor(innerErrorCode?: string) {
    super(
      ErrorType.User,
      "ConfigureWebAppError",
      `Failed to retrieve or update Azure Web App Settings${
        innerErrorCode ? `: ${innerErrorCode}` : ""
      }.`,
      [tips.reProvision]
    );
  }
}

export class BuildError extends BlazorPluginError {
  constructor(innerError?: Error) {
    super(
      ErrorType.User,
      "BuildError",
      "Failed to build Blazor project.",
      [tips.checkLog, tips.reDeploy],
      undefined,
      innerError
    );
  }
}

export class ZipError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "ZipError", "Failed to generate zip package.", [
      tips.checkFsPermissions,
      tips.reDeploy,
    ]);
  }
}

export class PublishCredentialError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "PublishCredentialError", "Failed to retrieve publish credential.", [
      tips.doProvision,
      tips.reDeploy,
    ]);
  }
}

export class UploadZipError extends BlazorPluginError {
  constructor() {
    super(ErrorType.User, "UploadZipError", "Failed to upload zip package.", [
      tips.checkNetwork,
      tips.reDeploy,
    ]);
  }
}

export const UnhandledErrorCode = "UnhandledError";
export const UnhandledErrorMessage = "Unhandled error.";

export async function runWithErrorCatchAndThrow<T>(
  error: BlazorPluginError,
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
  wrap: (error: any) => BlazorPluginError,
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
