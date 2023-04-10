import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

/**
 * Script execution timeout
 */
export class ScriptTimeoutError extends UserError {
  constructor(cmd: string) {
    const key = "error.script.ScriptTimeoutError";
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptTimeoutError",
      message: getDefaultString(key, cmd),
      displayMessage: getLocalizedString(key, cmd),
    };
    super(errorOptions);
  }
}

/**
 * Script execution error
 */
export class ScriptExecutionError extends UserError {
  constructor(message: string) {
    const key = "error.script.ScriptExecutionError";
    const errorOptions: UserErrorOptions = {
      source: "script",
      name: "ScriptExecutionError",
      message: getDefaultString(key, message),
      displayMessage: getLocalizedString(key, message),
    };
    super(errorOptions);
  }
}
