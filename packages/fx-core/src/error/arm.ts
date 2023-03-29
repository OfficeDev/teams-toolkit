import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

/**
 * Failed to compile bicep into ARM template
 */
export class CompileBicepError extends UserError {
  constructor(filePath: string, error: Error) {
    const key = "error.arm.CompileBicepError";
    const errorOptions: UserErrorOptions = {
      source: "arm/deploy",
      name: "CompileBicepError",
      message: getDefaultString(key, filePath, error.message || ""),
      displayMessage: getLocalizedString(key, filePath, error.message || ""),
    };
    super(errorOptions);
  }
}
