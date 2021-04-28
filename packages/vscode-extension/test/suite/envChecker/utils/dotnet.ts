// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { logger } from "../adapters/testLogger";


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
    return await hasAnyDotnetVersions(dotnetExecPath, [versionString])
}

export async function hasAnyDotnetVersions(dotnetExecPath: string, versionStrings: string[]): Promise<boolean> {
    try {
        const output = await cpUtils.executeCommand(undefined, logger, undefined, dotnetExecPath, "--list-sdks");
        return output.split(/\r?\n/).some((line: string) =>  {
            return versionStrings.some((versionString) => line.startsWith(versionString));
        });
    } catch (error) {
        console.debug(`Failed to run "${dotnetExecPath} --list-sdks", error = '${error}'`);
        return false;
    }
}