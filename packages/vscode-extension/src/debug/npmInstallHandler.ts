// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";

import { loadPackageJson } from "./commonUtils";

const Arborist = require("@npmcli/arborist");

export async function checkDependencies(folder: string): Promise<boolean> {
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

export async function runNpmInstallAll(projectRoot: string): Promise<void> {
  const packageJson = await loadPackageJson(path.join(projectRoot, "package.json"));
  if (packageJson && packageJson.scripts && packageJson.scripts["installAll"]) {
    const terminal = vscode.window.createTerminal({
      cwd: projectRoot,
    });
    terminal.show();
    terminal.sendText("npm run installAll");
  }
}
