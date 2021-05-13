// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SemVer } from "semver";

import { execute } from "./execute";
import { Logger } from "./logger";

export async function getNodeVersion(workingDir?: string): Promise<string | undefined> {
  try {
    const output = await execute("node -v", workingDir);
    const ver = new SemVer(output);
    return ver.major.toString();
  } catch (e) {
    Logger.error(`Failed to query node version: ${e}`);
    return undefined;
  }
}
