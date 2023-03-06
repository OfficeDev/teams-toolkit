// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { isValidProject } from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

import { UserState } from "./constants";
import { UriHandler } from "./uriHandler";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isTeamsFxProject = false;
export let isSPFxProject = false;
export let isExistingUser = "no";
export let uriEventHandler: UriHandler;

if (vscode.workspace && vscode.workspace.workspaceFolders) {
  if (vscode.workspace.workspaceFolders.length > 0) {
    workspaceUri = vscode.workspace.workspaceFolders[0].uri;
  }
}

export function initializeGlobalVariables(ctx: vscode.ExtensionContext): void {
  context = ctx;
  isExistingUser = context.globalState.get<string>(UserState.IsExisting) || "no";
  isTeamsFxProject = isValidProject(workspaceUri?.fsPath);
  isSPFxProject = fs.existsSync(path.join(workspaceUri?.fsPath ?? "./", "SPFx"));
}

export function setUriEventHandler(uriHandler: UriHandler) {
  uriEventHandler = uriHandler;
}
