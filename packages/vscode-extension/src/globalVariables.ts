// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { ConfigFolderName } from "@microsoft/teamsfx-api";

import { UserState } from "./constants";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isTeamsFxProject = false;
export let isSPFxProject = false;
export let isExistingUser = "no";

export function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
  context = ctx;
  isExistingUser = context.globalState.get<string>(UserState.IsExisting) || "no";
  if (vscode.workspace && vscode.workspace.workspaceFolders) {
    if (vscode.workspace.workspaceFolders.length > 0) {
      workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    }
  }
  isTeamsFxProject = fs.existsSync(path.join(workspaceUri?.fsPath ?? "./", `.${ConfigFolderName}`));
  isSPFxProject = fs.existsSync(path.join(workspaceUri?.fsPath ?? "./", "SPFx"));
}
