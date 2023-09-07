// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { HelpLinks } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";

/**
 * Failed to get M365 token JSON object after sign in
 */
export class M365TokenJSONNotFoundError extends SystemError {
  constructor() {
    const key = "error.m365.M365TokenJSONNotFoundError";
    const errorOptions: SystemErrorOptions = {
      source: "coordinator",
      name: "M365TokenJSONNotFoundError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * M365 tenant id in token object is not available
 */
export class M365TenantIdNotFoundInTokenError extends SystemError {
  constructor() {
    const key = "error.m365.M365TenantIdNotFoundInTokenError";
    const errorOptions: SystemErrorOptions = {
      source: "coordinator",
      name: "M365TenantIdNotFoundInTokenError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}

/**
 * The M365 tenant id in .env does not match with the one in token signed in
 */
export class M365TenantIdNotMatchError extends UserError {
  constructor(signedInTenantId: string, dotEnvTenantId: string, clearKeys: string) {
    const key = "error.m365.M365TenantIdNotMatchError";
    const errorOptions: UserErrorOptions = {
      source: "coordinator",
      name: "M365TenantIdNotMatchError",
      message: getDefaultString(key, signedInTenantId, dotEnvTenantId, clearKeys),
      displayMessage: getLocalizedString(key, signedInTenantId, dotEnvTenantId, clearKeys),
      helpLink: HelpLinks.SwitchTenant,
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}
