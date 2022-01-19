// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import { loadPackageJson } from "./commonUtils";

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
