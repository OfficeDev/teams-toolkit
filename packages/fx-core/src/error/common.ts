import { SystemError, UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
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

export class UnresolvedPlaceholderError extends UserError {
  constructor(source: string, placeholders: string, filePath?: string, helpLink?: string) {
    const key = "error.common.UnresolvedPlaceholderError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "UnresolvedPlaceholderError",
      message: getDefaultString(key, placeholders, filePath || globalVars.ymlFilePath),
      displayMessage: getLocalizedString(key, placeholders, filePath || globalVars.ymlFilePath),
      helpLink: helpLink || "https://aka.ms/teamsfx-actions",
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
  constructor(filePathOrContent: string, e: Error) {
    super({
      message: getDefaultString("error.common.JSONSyntaxError", filePathOrContent, e.message),
      displayMessage: getLocalizedString(
        "error.common.JSONSyntaxError",
        filePathOrContent,
        e.message
      ),
      source: "coordinator",
    });
    super.stack = e.stack;
  }
}

export class ReadFileError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: source || "unknown",
      message: e.message || getDefaultString("error.common.ReadFileError"),
      displayMessage: e.message || getLocalizedString("error.common.ReadFileError"),
    });
    if (e.stack) super.stack = e.stack;
  }
}

export class UnhandledError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: camelCase(source || "unknown"),
      message: getDefaultString("error.common.UnhandledError", source || "", e.message),
      displayMessage: getLocalizedString("error.common.UnhandledError", source || "", e.message),
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
  constructor(name: string) {
    super({
      source: "coordinator",
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
