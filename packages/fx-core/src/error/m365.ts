import {
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { HelpLinks } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { globalVars } from "../core/globalVars";

/**
 * Failed to get M365 token JSON object after sign in
 */
export class M365TokenJSONNotFoundError extends SystemError {
  constructor() {
    const key = "error.azure.M365TokenJSONNotFoundError";
    const errorOptions: SystemErrorOptions = {
      source: "coordinator",
      name: "M365TokenJSONNotFoundError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
    };
    super(errorOptions);
  }
}

/**
 * M365 tenant id in token object is not available
 */
export class M365TenantIdNotFoundInTokenError extends SystemError {
  constructor() {
    const key = "error.azure.M365TenantIdNotFoundInTokenError";
    const errorOptions: SystemErrorOptions = {
      source: "coordinator",
      name: "M365TenantIdNotFoundInTokenError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
    };
    super(errorOptions);
  }
}

/**
 * The M365 tenant id in .env does not match with the one in token signed in
 */
export class M365TenantIdNotMatchError extends UserError {
  constructor(signedInTenantId: string, dotEnvTenantId: string, clearKeys: string) {
    const key = "error.azure.M365TenantIdNotMatchError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "M365TenantIdNotMatchError",
      message: getDefaultString(
        key,
        signedInTenantId,
        dotEnvTenantId,
        clearKeys,
        globalVars.envFilePath
      ),
      displayMessage: getLocalizedString(
        key,
        signedInTenantId,
        dotEnvTenantId,
        clearKeys,
        globalVars.envFilePath
      ),
      helpLink: HelpLinks.SwitchTenant,
    };
    super(errorOptions);
  }
}
