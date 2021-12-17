// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, SystemError } from "@microsoft/teamsfx-api";
import { SolutionSource } from "../constants";

export function ScaffoldLocalDebugSettingsError(error: any): SystemError {
  return returnSystemError(error, SolutionSource, "ScaffoldLocalDebugSettingsError");
}
