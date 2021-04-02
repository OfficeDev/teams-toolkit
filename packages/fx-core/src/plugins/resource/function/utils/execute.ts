// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";

import { Logger } from "./logger";

export async function execute(command: string, workingDir?: string, showInOutputWindow = false): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: workingDir }, (error, standardOutput) => {
            Logger.info(`Start to run command: ${command}`);
            if (showInOutputWindow) {
                Logger.info(`${standardOutput}`);
            }
            if (error) {
                Logger.error(`Fail to run command: ${command}`);
                reject(error);
                return;
            }
            resolve(standardOutput);
        });
    });
}
