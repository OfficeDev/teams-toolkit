// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as fs from "fs-extra";
import { isValidProject } from "@microsoft/teamsfx-core";
import { initializeGlobalVariables, context } from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import TreeViewManagerInstance from "../treeview/treeViewManager";

export function addFileSystemWatcher(workspacePath: string) {
  if (isValidProject(workspacePath)) {
    const packageLockFileWatcher = vscode.workspace.createFileSystemWatcher("**/package-lock.json");

    packageLockFileWatcher.onDidCreate(async (event) => {
      await sendSDKVersionTelemetry(event.fsPath);
    });

    packageLockFileWatcher.onDidChange(async (event) => {
      await sendSDKVersionTelemetry(event.fsPath);
    });

    const yorcFileWatcher = vscode.workspace.createFileSystemWatcher("**/.yo-rc.json");
    yorcFileWatcher.onDidCreate((event) => {
      refreshSPFxTreeOnFileChanged();
    });
    yorcFileWatcher.onDidChange((event) => {
      refreshSPFxTreeOnFileChanged();
    });
    yorcFileWatcher.onDidDelete((event) => {
      refreshSPFxTreeOnFileChanged();
    });
  }
}

export function refreshSPFxTreeOnFileChanged() {
  initializeGlobalVariables(context);
  TreeViewManagerInstance.updateTreeViewsOnSPFxChanged();
}

export async function sendSDKVersionTelemetry(filePath: string) {
  const packageLockFile = (await fs.readJson(filePath).catch(() => {})) as {
    dependencies: { [key: string]: { version: string } };
  };
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateSDKPackages, {
    [TelemetryProperty.BotbuilderVersion]: packageLockFile?.dependencies["botbuilder"]?.version,
    [TelemetryProperty.TeamsFxVersion]:
      packageLockFile?.dependencies["@microsoft/teamsfx"]?.version,
    [TelemetryProperty.TeamsJSVersion]:
      packageLockFile?.dependencies["@microsoft/teams-js"]?.version,
  });
}
