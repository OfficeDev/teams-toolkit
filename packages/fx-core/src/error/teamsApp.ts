// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, SystemErrorOptions } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorCategory } from "./types";
import { Constants } from "../component/driver/teamsApp/constants";

export class DeveloperPortalAPIFailedError extends SystemError {
  constructor(e: any, correlationId: string, apiName: string, extraData: string) {
    const errorOptions: SystemErrorOptions = {
      source: Constants.PLUGIN_NAME,
      error: e,
      message: getDefaultString(
        "error.appstudio.apiFailed.telemetry",
        e.name,
        e.message,
        apiName,
        correlationId,
        extraData
      ),
      displayMessage: getLocalizedString("error.appstudio.apiFailed"),
      categories: [ErrorCategory.Unhandled],
    };
    super(errorOptions);
  }
}

export class CheckSideloadingPermissionFailedError extends SystemError {
  constructor(e: any, correlationId: string, apiName: string, extraData: string) {
    const errorOptions: SystemErrorOptions = {
      source: "M365Account",
      error: e,
      message: getDefaultString(
        "error.appstudio.apiFailed.telemetry",
        e.name,
        e.message,
        apiName,
        correlationId,
        extraData
      ),
      categories: [ErrorCategory.External],
    };
    super(errorOptions);
  }
}
