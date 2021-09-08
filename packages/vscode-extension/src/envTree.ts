// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, Void, TreeCategory, TreeItem } from "@microsoft/teamsfx-api";
import {
  isMultiEnvEnabled,
  environmentManager,
  setActiveEnv,
  isRemoteCollaborateEnabled,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import TreeViewManagerInstance, { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { getActiveEnv } from "./utils/commonUtils";
import * as StringResources from "./resources/Strings.json";
import { checkPermission, listCollaborator } from "./handlers";

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
    for (const item of envNamesResult.value) {
      showEnvList.push(item);
      let userList: TreeItem[] = [];
      const canAddCollaborator = await checkPermission(item);
      if (isRemoteCollaborateEnabled()) {
        userList = await listCollaborator(item);
      }
      environmentTreeProvider.add([
        {
          commandId: "fx-extension.environment." + item,
          label: item,
          parent: TreeCategory.Environment,
          contextValue: canAddCollaborator ? "environmentWithPermission" : "environment",
          icon: item === activeEnv ? "folder-active" : "symbol-folder",
          isCustom: false,
          description:
            item === activeEnv ? StringResources.vsc.commandsTreeViewProvider.acitve : "",
          subTreeItems: userList ?? [],
        },
      ]);
    }
  }
  return ok(Void);
}
