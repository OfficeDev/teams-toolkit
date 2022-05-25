/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
  export let context: vscode.ExtensionContext;
  export let workspaceUri: vscode.Uri;
}

export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;

export function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
  if (vscode.workspace && vscode.workspace.workspaceFolders) {
    if (vscode.workspace.workspaceFolders.length > 0) {
      ext.workspaceUri = workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    }
  }
  ext.context = context = ctx;
}
