// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogProvider } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";

const Arborist = require("@npmcli/arborist");
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

export async function checkNpmDependencies(folder: string): Promise<boolean> {
  if (await fs.pathExists(folder)) {
    const packageJson = await loadPackageJson(path.join(folder, "package.json"));
    if (
      (packageJson?.dependencies && Object.keys(packageJson?.dependencies).length > 0) ||
      (packageJson?.devDependencies && Object.keys(packageJson?.devDependencies).length > 0)
    ) {
      // load deps from node_modules
      const arb = new Arborist({ path: folder });
      try {
        await arb.loadActual();
      } catch (error: any) {
        return false;
      }

      // check if any missing dependency
      const dependencies =
        arb.actualTree?.edgesOut === undefined ? [] : [...arb.actualTree.edgesOut.values()];
      return !dependencies.some((dependency) => dependency.error === "MISSING");
    } else {
      // treat no deps as npm installed
      return true;
    }
  }

  // treat missing folder as npm installed
  return true;
}
