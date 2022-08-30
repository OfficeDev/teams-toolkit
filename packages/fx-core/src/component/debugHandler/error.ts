// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";

export const errorSource = "debugHandler";

export class InvalidSSODebugArgsError extends UserError {
  constructor() {
    super({
      source: errorSource,
      message: getDefaultString("error.debugHandler.InvalidSSODebugArgsError"),
      displayMessage: getLocalizedString("error.debugHandler.InvalidSSODebugArgsError"),
    });
  }
}
