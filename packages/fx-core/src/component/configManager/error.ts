// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
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
    // errorOptions.helpLink = helpLink;
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
    // errorOptions.helpLink = helpLink;
    super(errorOptions);
    this.innerError = reason;
  }
}

export class InvalidLifecycleError extends UserError {
  constructor(lifecycle: LifecycleName) {
    const key = "configManager.error.invalidLifecycle";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "YamlParsingError",
      message: getDefaultString(key, lifecycle),
      displayMessage: getLocalizedString(key, lifecycle),
    };
    // errorOptions.helpLink = helpLink;
    super(errorOptions);
  }
}
