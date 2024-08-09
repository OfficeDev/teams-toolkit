// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";

/**
 * Script execution timeout
 */
export class ScriptTimeoutError extends UserError {
  constructor(error?: Error) {
    const key = "error.script.ScriptTimeoutError";
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptTimeoutError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      error: error,
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * Script execution error
 */
export class ScriptExecutionError extends UserError {
  constructor(error?: Error) {
    const key = "error.script.ScriptExecutionError";
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptExecutionError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      error: error,
      categories: [ErrorCategory.External],
      userData: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    };
    super(errorOptions);
  }
}
