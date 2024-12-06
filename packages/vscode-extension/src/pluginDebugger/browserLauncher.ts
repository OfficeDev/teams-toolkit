// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as vscode from "vscode";
import * as browserLocator from "./browserLocator";
import * as os from "os";
import * as path from "path";

export const launchBrowser = async (url: string) => {
  const outputChannel = vscode.debug.activeDebugConsole;
  outputChannel.appendLine(`Launching web browser window for Copilot.`);
  try {
    const browserLocation = await browserLocator.getEdgeLocation();
    const tempDir = os.tmpdir();
    const tempUserDataDir = path.join(tempDir, "copilot-edge-user-data-dir");
    cp.spawn(
      browserLocation,
      ["--remote-debugging-port=9222", `--user-data-dir=${tempUserDataDir}`, "--no-first-run", url],
      {
        stdio: "ignore",
        detached: false,
      }
    );
  } catch (error) {
    outputChannel.appendLine(
      `Error launching browser window for copilot, ${(error as Error).message}`
    );
    void vscode.window.showErrorMessage(
      `Error launching browser window for copilot, ${(error as Error).message}`
    );
    throw error;
  }
};
