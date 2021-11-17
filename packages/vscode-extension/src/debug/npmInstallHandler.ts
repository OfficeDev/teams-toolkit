// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";

import { loadPackageJson } from "./commonUtils";

export async function hasNpmInstalled(folder: string): Promise<boolean> {
  if (await fs.pathExists(folder)) {
    // after npm install done, package-lock.json should exist
    const packageLockJsonPath = path.join(folder, "package-lock.json");
    if (await fs.pathExists(packageLockJsonPath)) {
      const packageJson = await loadPackageJson(path.join(folder, "package.json"));
      if (
        (packageJson?.dependencies && Object.keys(packageJson?.dependencies).length > 0) ||
        (packageJson?.devDependencies && Object.keys(packageJson?.devDependencies).length > 0)
      ) {
        // deps should exist
        const nodeModulesFolder = path.join(folder, "node_modules");
        if (
          (await fs.pathExists(nodeModulesFolder)) &&
          fs.statSync(nodeModulesFolder).isDirectory()
        ) {
          const modules = await fs.readdir(nodeModulesFolder);
          return (
            modules !== undefined &&
            modules.some((module) => module !== undefined && !module.startsWith("."))
          );
        } else {
          // no node_modules
          return false;
        }
      } else {
        // treat no deps as npm installed
        return true;
      }
    }
  }

  return false;
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
