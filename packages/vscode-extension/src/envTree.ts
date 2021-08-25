// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, Void, TreeCategory } from "@microsoft/teamsfx-api";
import { isMultiEnvEnabled, environmentManager } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import TreeViewManagerInstance, { CommandsTreeViewProvider } from "./commandsTreeViewProvider";

export async function registerEnvTreeHandler(): Promise<Result<Void, FxError>> {
  if (isMultiEnvEnabled() && vscode.workspace.workspaceFolders) {
    const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    const envNamesResult = await environmentManager.listEnvProfiles(workspacePath);
    if (envNamesResult.isErr()) {
      return err(envNamesResult.error);
    }
    const environmentTreeProvider: CommandsTreeViewProvider =
      TreeViewManagerInstance.getTreeView("teamsfx-environment")!;
    envNamesResult.value.forEach((item) => {
      environmentTreeProvider.add([
        {
          commandId: "fx-extension.environment." + item,
          label: item,
          parent: TreeCategory.Environment,
          contextValue: "environment",
          icon: "symbol-folder",
          isCustom: false,
        },
      ]);
    });
  }
  return ok(Void);
}
