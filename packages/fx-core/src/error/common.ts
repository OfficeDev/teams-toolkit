import { UserError, UserErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { globalVars } from "../core/globalVars";

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
