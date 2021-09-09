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
import { signedIn } from "./commonlib/common/constant";
import { AppStudioLogin } from "./commonlib/appStudioLogin";

const showEnvList: Array<string> = [];
let environmentTreeProvider: CommandsTreeViewProvider;

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
    environmentTreeProvider = TreeViewManagerInstance.getTreeView("teamsfx-environment")!;
    if (showEnvList.length > 0) {
      showEnvList.forEach(async (item) => {
        environmentTreeProvider.removeById("fx-extension.environment." + item);
      });
    }
    showEnvList.splice(0);
    for (const item of envNamesResult.value) {
      showEnvList.push(item);
      environmentTreeProvider.add([
        {
          commandId: "fx-extension.environment." + item,
          label: item,
          parent: TreeCategory.Environment,
          contextValue: "environment",
          icon: item === activeEnv ? "folder-active" : "symbol-folder",
          isCustom: false,
          description:
            item === activeEnv ? StringResources.vsc.commandsTreeViewProvider.acitve : "",
          expanded: true,
        },
      ]);
    }

    for (const item of envNamesResult.value) {
      await updateCollaboratorList(item);
    }
  }
  return ok(Void);
}

export async function updateCollaboratorList(env: string): Promise<void> {
  if (environmentTreeProvider && isRemoteCollaborateEnabled()) {
    let userList: TreeItem[] = [];

    const parentCommand = environmentTreeProvider.findCommand("fx-extension.environment." + env);
    if (parentCommand) {
      const loginStatus = await AppStudioLogin.getInstance().getStatus();
      if (loginStatus.status == signedIn) {
        const canAddCollaborator = await checkPermission(env);
        parentCommand.contextValue = canAddCollaborator
          ? "environmentWithPermission"
          : "environment";
        if (isRemoteCollaborateEnabled()) {
          userList = await listCollaborator(env);
        }
      } else {
        userList = [
          {
            commandId: `fx-extension.listcollaborator.${env}`,
            label: "You need to log in first to view all collaborators.",
            icon: "warning",
            isCustom: true,
            parent: "fx-extension.environment." + env,
          },
        ];
      }
    }

    await environmentTreeProvider.add(userList);
  }
}
