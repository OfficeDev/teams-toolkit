// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";

export async function getNodeVersion(): Promise<string | null> {
    const nodeVersionRegex = /v(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
    try {
        const output = await cpUtils.executeCommand(undefined, undefined, undefined, "node", "--version");
        const match = nodeVersionRegex.exec(output);
        if (match && match.groups?.major_version) {
            return match.groups.major_version;
        } else {
            return null;
        }
    } catch (error) {
        console.debug(`Failed to run 'node --version', error = '${error}'`);
        return null;
    }
}