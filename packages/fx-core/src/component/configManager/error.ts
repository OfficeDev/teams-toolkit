// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { globalVars } from "../../core/globalVars";
import { LifecycleName } from "./interface";

const component = "ConfigManager";

export class DriverNotFoundError extends UserError {
  constructor(taskName: string, uses: string) {
    const key = "configManager.error.driverNotFound";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "DriverNotFoundError",
      message: getDefaultString(key, uses, taskName),
      displayMessage: getLocalizedString(key, uses, taskName),
    };
    errorOptions.helpLink = "https://aka.ms/teamsfx-actions/action-not-found";
    super(errorOptions);
  }
}

export class YamlParsingError extends UserError {
  constructor(yamlPath: string, reason: Error) {
    const key = "configManager.error.yamlParsing";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "YamlParsingError",
      message: getDefaultString(key, yamlPath, reason.message),
      displayMessage: getLocalizedString(key, yamlPath, reason.message),
    };
    errorOptions.helpLink = "https://aka.ms/teamsfx-actions/yaml-parsing-error";
    super(errorOptions);
    this.innerError = reason;
  }
}

export class InvalidYmlSchemaError extends UserError {
  constructor(lifecycle: LifecycleName) {
    const key = "configManager.error.invalidYmlSchema";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "InvalidYmlSchemaError",
      message: getDefaultString(key, lifecycle, globalVars.ymlFilePath),
      displayMessage: getLocalizedString(key, lifecycle, globalVars.ymlFilePath),
    };
    errorOptions.helpLink = "https://aka.ms/teamsfx-actions/invalid-lifecycle-error";
    super(errorOptions);
  }
}
export class InvalidEnvFolderPath extends UserError {
  constructor(reason?: string) {
    const key = "configManager.error.invalidEnvFolderPath";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "InvalidEnvFolderPathError",
      message: getDefaultString(key) + `${reason ? "(" + reason + ")" : ""}`,
      displayMessage: getLocalizedString(key) + `${reason ? "(" + reason + ")" : ""}`,
    };
    errorOptions.helpLink = "https://aka.ms/teamsfx-actions/invalid-env-folder-error";
    super(errorOptions);
  }
}

export class InvalidEnvFieldError extends UserError {
  constructor(actionName: string, lifecycle: LifecycleName) {
    const key = "configManager.error.invalidEnvField";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "InvalidEnvFieldError",
      message: getDefaultString(key, actionName, lifecycle),
      displayMessage: getLocalizedString(key, actionName, lifecycle),
    };
    errorOptions.helpLink = "https://aka.ms/teamsfx-actions/invalid-env-field-error";
    super(errorOptions);
  }
}
