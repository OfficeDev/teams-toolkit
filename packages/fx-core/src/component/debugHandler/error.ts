// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";

export const errorSource = "debugHandler";

export function InvalidSSODebugArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidSSODebugArgsError",
    getDefaultString("error.debugHandler.InvalidSSODebugArgsError"),
    getLocalizedString("error.debugHandler.InvalidSSODebugArgsError")
  );
}

export function InvalidBotDebugArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidBotDebugArgsError",
    getDefaultString("error.debugHandler.InvalidBotDebugArgsError"),
    getLocalizedString("error.debugHandler.InvalidBotDebugArgsError")
  );
}

export function InvalidTabDebugArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidTabDebugArgsError",
    getDefaultString("error.debugHandler.InvalidTabDebugArgsError"),
    getLocalizedString("error.debugHandler.InvalidTabDebugArgsError")
  );
}
