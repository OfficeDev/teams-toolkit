/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */

import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as browserLocator from './browser-locator';
import * as os from 'os';
import * as path from 'path';

export const launchBrowser = async (url: string) => {
  try {
    const browserLocation = await browserLocator.getEdgeLocation();
    const tempDir = os.tmpdir();
    const tempUserDataDir = path.join(tempDir, 'copilot-edge-user-data-dir');
    cp.spawn(
      browserLocation,
      ["--remote-debugging-port=9222",
        `--user-data-dir=${tempUserDataDir}`,
        "--no-first-run",
        url
      ],
      {
        stdio: "ignore",
        detached: false,
      }
    );
  } catch (error) {
    void vscode.window.showErrorMessage(`Error launching browser, ${(error as Error).message}`);
    throw error;
  }
};