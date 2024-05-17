// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Context } from "@microsoft/teamsfx-api";
import { TOOLS } from "../core/globalVars";

export function createContextV3(): Context {
  const context: Context = {
    userInteraction: TOOLS.ui,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    tokenProvider: TOOLS.tokenProvider,
  };
  return context;
}
