// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, Void, TreeCategory } from "@microsoft/teamsfx-api";
import { isMultiEnvEnabled, environmentManager, setActiveEnv } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import TreeViewManagerInstance, { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { getActiveEnv } from "./utils/commonUtils";

const showEnvList: Array<string> = [];

export async function registerEnvTreeHandler(): Promise<Result<Void, FxError>> {
  if (isMultiEnvEnabled() && vscode.workspace.workspaceFolders) {
    const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    const envNamesResult = await environmentManager.listEnvConfigs(workspacePath);
    if (envNamesResult.isErr()) {
      return err(envNamesResult.error);
    }
    const activeEnv = getActiveEnv();
    if (activeEnv) {
      setActiveEnv(activeEnv);
    }
    const environmentTreeProvider: CommandsTreeViewProvider =
      TreeViewManagerInstance.getTreeView("teamsfx-environment")!;
    if (showEnvList.length > 0) {
      showEnvList.forEach(async (item) => {
        environmentTreeProvider.removeById("fx-extension.environment." + item);
      });
    }
    showEnvList.splice(0);
    envNamesResult.value.forEach((item) => {
      showEnvList.push(item);
      environmentTreeProvider.add([
        {
          commandId: "fx-extension.environment." + item,
          label: item,
          parent: TreeCategory.Environment,
          contextValue: "environment",
          icon: "symbol-folder",
          isCustom: false,
          description: item === activeEnv ? "active" : "",
        },
      ]);
    });
  }
  return ok(Void);
}
