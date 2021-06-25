// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { FxError, returnUserError, UserError } from "@microsoft/teamsfx-api";

import * as constants from "../../constants";

export function WorkspaceNotSupported(workspaceFolder: string): UserError {
    return returnUserError(new Error(`Workspace '${workspaceFolder}' is not supported.`), constants.cliSource, "WorkspaceNotSupported");
}

export function ExclusiveLocalRemoteOptions(): UserError {
    return returnUserError(new Error("Options --local and --remote are exclusive."), constants.cliSource, "ExclusiveLocalRemoteOptions");
}

export function RequiredPathNotExists(path: string): UserError {
    return returnUserError(new Error(`Required path '${path}' does not exist.`), constants.cliSource, "RequiredPathNotExists");
}

export function TaskFailed(taskTitle: string): UserError {
    let words = taskTitle.split(" ");
    words = words.map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    });
    return returnUserError(new Error(`Task '${taskTitle}' failed.`), constants.cliSource, `${words.join("")}Failed`);
}

export function PreviewCommandFailed(fxErrors: FxError[]): UserError {
    const errors = fxErrors.map((error) => {
        return `${error.source}.${error.name}`;
    });
    return returnUserError(new Error(`The preview command failed: ${errors.join(", ")}.`), constants.cliSource, "PreviewCommandFailed");
}
