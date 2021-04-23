// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";


export async function getDotnetExecPathFromConfig(dotnetConfigPath: string): Promise<string | null> {
    try {
        const config = await fs.readJson(dotnetConfigPath, { encoding: "utf-8" });
        if (typeof config.dotnetExecutablePath === "string") {
            return config.dotnetExecutablePath;
        }
    } catch (error) {
        console.debug(`Failed to getDotnetConfig, error = '${error}'`);
    }
    return null;
}

export async function hasDotnetVersion(dotnetExecPath: string, versionString: string): Promise<boolean> {
    const output = await cpUtils.executeCommand(undefined, undefined, undefined, dotnetExecPath, "--list-sdks");
    return output.split(/\r?\n/).some((line: string) => line.startsWith(versionString));
}