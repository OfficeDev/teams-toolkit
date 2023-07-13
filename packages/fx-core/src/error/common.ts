// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError, UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { camelCase } from "lodash";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { globalVars } from "../core/globalVars";

export class FileNotFoundError extends UserError {
  constructor(source: string, filePath: string, helpLink?: string) {
    const key = "error.common.FileNotFoundError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "FileNotFoundError",
      message: getDefaultString(key, filePath),
      displayMessage: getLocalizedString(key, filePath),
      helpLink: helpLink,
    };
    super(errorOptions);
  }
}

export class MissingEnvironmentVariablesError extends UserError {
  constructor(source: string, variableNames: string, filePath?: string, helpLink?: string) {
    const templateFilePath = filePath || globalVars.ymlFilePath || "";
    const envFilePath = globalVars.envFilePath || "";
    const key = "error.common.MissingEnvironmentVariablesError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "MissingEnvironmentVariablesError",
      message: getDefaultString(key, variableNames, templateFilePath, envFilePath),
      displayMessage: getLocalizedString(key, variableNames, templateFilePath, envFilePath),
      helpLink: helpLink || "https://aka.ms/teamsfx-v5.0-guide#environments",
    };
    super(errorOptions);
  }
}

export class InvalidActionInputError extends UserError {
  constructor(actionName: string, parameters: string[], helpLink?: string) {
    const key = "error.yaml.InvalidActionInputError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(actionName),
      name: "InvalidActionInputError",
      message: getDefaultString(key, actionName, parameters.join(","), globalVars.ymlFilePath),
      displayMessage: getLocalizedString(
        key,
        actionName,
        parameters.join(","),
        globalVars.ymlFilePath
      ),
      helpLink: helpLink || "https://aka.ms/teamsfx-actions",
    };
    super(errorOptions);
  }
}

export class InvalidProjectError extends UserError {
  constructor() {
    super({
      message: getDefaultString("error.common.InvalidProjectError"),
      displayMessage: getLocalizedString("error.common.InvalidProjectError"),
      source: "coordinator",
    });
  }
}

export class JSONSyntaxError extends UserError {
  constructor(filePathOrContent: string, e: Error, source?: string) {
    super({
      message: getDefaultString("error.common.JSONSyntaxError", filePathOrContent, e.message),
      displayMessage: getLocalizedString(
        "error.common.JSONSyntaxError",
        filePathOrContent,
        e.message
      ),
      source: source || "coordinator",
    });
    super.stack = e.stack;
  }
}

export class ReadFileError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: source || "unknown",
      message: e.message || getDefaultString("error.common.ReadFileError", e.message),
      displayMessage: e.message || getLocalizedString("error.common.ReadFileError", e.message),
    });
    if (e.stack) super.stack = e.stack;
  }
}

export class WriteFileError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: source || "unknown",
      message: e.message || getDefaultString("error.common.WriteFileError", e.message),
      displayMessage: e.message || getLocalizedString("error.common.WriteFileError", e.message),
    });
    if (e.stack) super.stack = e.stack;
  }
}

export class UnhandledError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: camelCase(source || "unknown"),
      message: getDefaultString(
        "error.common.UnhandledError",
        source || "",
        e.message || JSON.stringify(e)
      ),
      displayMessage: getLocalizedString(
        "error.common.UnhandledError",
        source || "",
        e.message || JSON.stringify(e)
      ),
    });
    if (e.stack) super.stack = e.stack;
  }
}

export class UnhandledUserError extends UserError {
  constructor(e: Error, source?: string, helpLink?: string) {
    super({
      source: camelCase(source || "unknown"),
      message: getDefaultString(
        "error.common.UnhandledError",
        source || "",
        e.message || JSON.stringify(e)
      ),
      displayMessage: getLocalizedString(
        "error.common.UnhandledError",
        source || "",
        e.message || JSON.stringify(e)
      ),
      helpLink: helpLink,
    });
    if (e.stack) super.stack = e.stack;
  }
}

export class InstallSoftwareError extends UserError {
  constructor(source: string, nameAndVersion: string, helpLink?: string) {
    super({
      source: camelCase(source || "common"),
      message: getDefaultString("error.common.InstallSoftwareError", nameAndVersion),
      displayMessage: getLocalizedString("error.common.InstallSoftwareError", nameAndVersion),
    });
    if (helpLink) this.helpLink = helpLink;
  }
}

export class MissingRequiredInputError extends UserError {
  constructor(name: string, source?: string) {
    super({
      source: source || "coordinator",
      message: getDefaultString("error.common.MissingRequiredInputError", name),
      displayMessage: getLocalizedString("error.common.MissingRequiredInputError", name),
    });
  }
}

export class InputValidationError extends UserError {
  constructor(name: string, reason: string) {
    super({
      source: "coordinator",
      message: getDefaultString("error.common.InputValidationError", name, reason),
      displayMessage: getLocalizedString("error.common.InputValidationError", name, reason),
    });
  }
}

export class NoEnvFilesError extends UserError {
  constructor(source: string) {
    const key = "error.common.NoEnvFilesError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "NoEnvFilesError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
    };
    super(errorOptions);
  }
}

export class MissingRequiredFileError extends UserError {
  constructor(source: string, task: string, file: string) {
    const key = "error.common.MissingRequiredFileError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "MissingRequiredFileError",
      message: getDefaultString(key, task, file),
      displayMessage: getLocalizedString(key, task, file),
    };
    super(errorOptions);
  }
}

export class HttpClientError extends UserError {
  constructor(actionName: string, responseBody: string, helpLink?: string) {
    const messageKey = "error.common.HttpClientError";
    super({
      source: camelCase(actionName),
      name: "HttpClientError",
      message: getDefaultString(messageKey, actionName, responseBody),
      displayMessage: getLocalizedString(messageKey, actionName, responseBody),
      helpLink: helpLink,
    });
  }
}

export class HttpServerError extends SystemError {
  constructor(actionName: string, responseBody: string) {
    const messageKey = "error.common.HttpServerError";
    super({
      source: camelCase(actionName),
      name: "HttpServerError",
      message: getDefaultString(messageKey, actionName, responseBody),
      displayMessage: getLocalizedString(messageKey, actionName, responseBody),
    });
  }
}

export class UserCancelError extends UserError {
  constructor(actionName?: string) {
    super({
      source: actionName ? camelCase(actionName) : "ui",
      name: "UserCancel",
      message: "User canceled",
    });
  }
}

export class EmptyOptionError extends SystemError {
  constructor(source?: string) {
    super({ source: source ? camelCase(source) : "UI" });
  }
}

export class NotImplementedError extends SystemError {
  constructor(source: string, method: string) {
    super({ source: source, message: `Method not implemented:${method}` });
  }
}
export class ConcurrentError extends UserError {
  constructor(source: string) {
    super({
      source: source,
      message: getLocalizedString("error.common.ConcurrentError"),
    });
  }
}

export function assembleError(e: any, source?: string): FxError {
  if (e instanceof UserError || e instanceof SystemError) return e;
  if (!source) source = "unknown";
  const type = typeof e;
  if (type === "string") {
    return new UnhandledError(new Error(e as string), source);
  } else if (e instanceof Error) {
    const err = e as Error;
    const fxError = new UnhandledError(err, source);
    fxError.stack = err.stack;
    return fxError;
  } else {
    const message = JSON.stringify(e, Object.getOwnPropertyNames(e));
    return new UnhandledError(new Error(message), source);
  }
}
