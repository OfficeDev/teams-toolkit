// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";

/**
 * Script execution timeout
 */
export class ScriptTimeoutError extends UserError {
  constructor(cmd: string, error?: any) {
    const key = "error.script.ScriptTimeoutError";
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptTimeoutError",
      message: getDefaultString(key, cmd),
      displayMessage: getLocalizedString(key, cmd),
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
  constructor(script: string, message: string, error?: any) {
    const key = "error.script.ScriptExecutionError";
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptExecutionError",
      message: getDefaultString(key, script, message),
      displayMessage: getLocalizedString(key, script, message),
      error: error,
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}
