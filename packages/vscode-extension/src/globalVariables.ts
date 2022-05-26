/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";
import * as fs from "fs";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isSPFxProject = false;

export function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
  context = ctx;
  if (vscode.workspace && vscode.workspace.workspaceFolders) {
    if (vscode.workspace.workspaceFolders.length > 0) {
      workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    }
  }
  if (fs.existsSync(`${workspaceUri?.fsPath}/SPFx`)) {
    isSPFxProject = true;
  }
}
