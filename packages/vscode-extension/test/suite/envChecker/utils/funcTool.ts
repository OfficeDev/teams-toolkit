// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";

export async function getFuncCoreToolsVersion(): Promise<string | null> {
    try {
        const output = await cpUtils.executeCommand(undefined, undefined, undefined, "func", "--version");
        const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
        const match = regex.exec(output);
        if (!match) {
            return null;
        }

        switch (match.groups?.major_version) {
            case "1":
                return "1";
            case "2":
                return "2";
            case "3":
                return "3";
            default:
                return null;
        }

    } catch (error) {
        console.debug(`Failed to run 'func --version', error = '${error}'`);
        return null;
    }
}