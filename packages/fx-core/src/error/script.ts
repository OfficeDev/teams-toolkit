// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";
import { maskSecret } from "../common/stringUtils";

/**
 * Script execution timeout
 */
export class ScriptTimeoutError extends UserError {
  constructor(error: Error, script: string) {
    const key = "error.script.ScriptTimeoutError";
    const maskedScript = maskSecret(script, { replace: "***" });
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptTimeoutError",
      message: getDefaultString(key, maskedScript),
      displayMessage: getLocalizedString(key + ".Notification"),
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
  constructor(error: Error, script: string) {
    const key = "error.script.ScriptExecutionError";
    const maskedScript = maskSecret(script, { replace: "***" });
    const maskedError = maskSecret(error.message || "", { replace: "***" });
    const maskedUserData = maskSecret(JSON.stringify(error, Object.getOwnPropertyNames(error)), {
      replace: "***",
    });
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptExecutionError",
      message: getDefaultString(key, maskedScript, maskedError),
      displayMessage: getLocalizedString(key + ".Notification", maskedError),
      error: error,
      categories: [ErrorCategory.External],
      userData: maskedUserData,
    };
    super(errorOptions);
  }
}
