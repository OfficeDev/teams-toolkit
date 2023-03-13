import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { globalVars } from "../core/globalVars";

export class FileNotFoundError extends UserError {
  constructor(source: string, filePath: string, helpLink?: string) {
    const key = "error.common.FileNotFoundError";
    const errorOptions: UserErrorOptions = {
      source: source,
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
      source: source,
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
    const key = "error.common.InvalidActionInputError";
    const dmsg = getLocalizedString(key, actionName, parameters.join(","), globalVars.ymlFilePath);
    const errorOptions: UserErrorOptions = {
      source: actionName,
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
      source: "common",
    });
  }
}
