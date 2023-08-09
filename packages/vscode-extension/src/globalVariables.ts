// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { UserState } from "./constants";
import { UriHandler } from "./uriHandler";
import { isValidProject } from "@microsoft/teamsfx-core";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isTeamsFxProject = false;
export let isSPFxProject = false;
export let isExistingUser = "no";
export let uriEventHandler: UriHandler;
export let defaultExtensionLogPath: string;
export let commandIsRunning = false;

if (vscode.workspace && vscode.workspace.workspaceFolders) {
  if (vscode.workspace.workspaceFolders.length > 0) {
    workspaceUri = vscode.workspace.workspaceFolders[0].uri;
  }
}

export function initializeGlobalVariables(ctx: vscode.ExtensionContext): void {
  context = ctx;
  isExistingUser = context.globalState.get<string>(UserState.IsExisting) || "no";
  isTeamsFxProject = isValidProject(workspaceUri?.fsPath);
  // Default Extension log path
  // e.g. C:/Users/xx/AppData/Roaming/Code/logs/20230221T095340/window7/exthost/TeamsDevApp.ms-teams-vscode-extension
  defaultExtensionLogPath = ctx.logUri.fsPath;
  if (!fs.pathExistsSync(defaultExtensionLogPath)) {
    fs.mkdirSync(defaultExtensionLogPath);
  }
  if (isTeamsFxProject && workspaceUri?.fsPath) {
    isSPFxProject = checkIsSPFx(workspaceUri?.fsPath);
  } else {
    isSPFxProject = fs.existsSync(path.join(workspaceUri?.fsPath ?? "./", "SPFx"));
  }
}

function checkIsSPFx(directory: string): boolean {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    if (file === ".yo-rc.json") {
      const content = fs.readJsonSync(path.join(directory, file)) as Record<string, unknown>;
      if (content["@microsoft/generator-sharepoint"]) {
        return true;
      }
    } else if (fs.lstatSync(path.join(directory, file)).isDirectory()) {
      if (checkIsSPFx(path.join(directory, file))) return true;
    }
  }
  return false;
}

export function setUriEventHandler(uriHandler: UriHandler) {
  uriEventHandler = uriHandler;
}

export function setCommandIsRunning(isRunning: boolean) {
  commandIsRunning = isRunning;
}

// Only used by checkProjectUpgradable() when error happens
export function unsetIsTeamsFxProject() {
  isTeamsFxProject = false;
}
