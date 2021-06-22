// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { returnUserError, UserError } from "@microsoft/teamsfx-api";

import * as constants from "../../constants";

export function WorkspaceNotSupported(workspaceFolder: string): UserError {
    return returnUserError(new Error(`Workspace '${workspaceFolder}' is not supported.`), constants.cliSource, "WorkspaceNotSupported");
}

export function ExclusiveLocalRemoteOptions(): UserError {
    return returnUserError(new Error("Options --local and --remote are exclusive."), constants.cliSource, "ExclusiveLocalRemoteOptions");
}
