// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogProvider } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";

const npmRunDevRegex = /npm[\s]+run[\s]+dev/im;

export async function loadPackageJson(path: string, logger?: LogProvider): Promise<any> {
  if (!(await fs.pathExists(path))) {
    logger?.error(`Cannot load package.json from ${path}. File not found.`);
    return undefined;
  }

  const rpj = require("read-package-json-fast");
  try {
    return await rpj(path);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    logger?.error(`Cannot load package.json from ${path}. Error: ${error}`);
    return undefined;
  }
}

export async function loadTeamsFxDevScript(componentRoot: string): Promise<string | undefined> {
  const packageJson = await loadPackageJson(path.join(componentRoot, "package.json"));
  if (packageJson && packageJson.scripts && packageJson.scripts["dev:teamsfx"]) {
    const devTeamsfx: string = packageJson.scripts["dev:teamsfx"];
    return npmRunDevRegex.test(devTeamsfx) ? packageJson.scripts["dev"] : devTeamsfx;
  } else {
    return undefined;
  }
}
