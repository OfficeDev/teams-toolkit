// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";
import { ConfigFolderName, FxError, IProgressHandler, LogLevel } from "@microsoft/teamsfx-api";

import * as constants from "./constants";
import { TaskResult } from "./task";
import cliLogger from "../../commonlib/log";
import { TaskFailed } from "./errors";

export async function getActiveResourcePlugins(workspaceFolder: string): Promise<string[]> {
    const settingsPath = path.join(workspaceFolder, `.${ConfigFolderName}`, constants.settingsFileName);
    const settings = await fs.readJson(settingsPath);
    return settings.solutionSettings.activeResourcePlugins;
}

export function createNpmInstallStartCb(progressBar: IProgressHandler, message: string): () => void {
    return () => {
        progressBar.start(message);
    };
}

export function createNpmInstallStopCb(taskTitle: string, progressBar: IProgressHandler, successMessage: string): (result: TaskResult) => FxError | null {
    return (result: TaskResult) => {
        if (result.exitCode === 0) {
            progressBar.next(successMessage);
            progressBar.end();
            return null;
        } else {
            const error = TaskFailed(taskTitle);
            cliLogger.necessaryLog(LogLevel.Error, `${error.name}: ${error.message}`);
            cliLogger.necessaryLog(LogLevel.Info, result.stderr[result.stderr.length - 1], true);
            return error;
        }
    };
}
