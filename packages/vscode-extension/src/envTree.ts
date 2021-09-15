// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, Void, TreeCategory, TreeItem } from "@microsoft/teamsfx-api";
import {
  isMultiEnvEnabled,
  environmentManager,
  setActiveEnv,
  isRemoteCollaborateEnabled,
  LocalSettingsProvider,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import TreeViewManagerInstance, { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { LocalEnvironment } from "./constants";
import * as StringResources from "./resources/Strings.json";
import { checkPermission, listCollaborator } from "./handlers";
import { signedIn } from "./commonlib/common/constant";
import { AppStudioLogin } from "./commonlib/appStudioLogin";
import * as fs from "fs-extra";
import { getResourceGroupNameFromEnv, getSubscriptionInfoFromEnv } from "./utils/commonUtils";

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
    let activeEnv: string | undefined = undefined;
    const envResult = environmentManager.getActiveEnv(workspacePath);
    // do not block user to manage env if active env cannot be retrieved
    if (envResult.isOk()) {
      activeEnv = envResult.value;
      setActiveEnv(activeEnv);
    }
    environmentTreeProvider = TreeViewManagerInstance.getTreeView("teamsfx-environment")!;
    if (showEnvList.length > 0) {
      showEnvList.forEach(async (item) => {
        environmentTreeProvider.removeById("fx-extension.environment." + item);
      });
    }
    showEnvList.splice(0);

    const envNames = (await localSettingsExists(workspacePath))
      ? [LocalEnvironment].concat(envNamesResult.value)
      : envNamesResult.value;
    for (const item of envNames) {
      showEnvList.push(item);
      environmentTreeProvider.add([
        {
          commandId: "fx-extension.environment." + item,
          label: item,
          parent: TreeCategory.Environment,
          contextValue: item === LocalEnvironment ? "local" : "environment",
          icon: getTreeViewItemIcon(item, activeEnv),
          isCustom: false,
          description:
            item === activeEnv ? StringResources.vsc.commandsTreeViewProvider.active : "",
          expanded: activeEnv === item,
        },
      ]);
    }

    for (const item of envNamesResult.value) {
      await addSubscriptionAndResourceGroupNode(item);
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
            label: StringResources.vsc.commandsTreeViewProvider.loginM365AccountToViewCollaborators,
            icon: "warning",
            isCustom: true,
            parent: "fx-extension.environment." + env,
          },
        ];
      }
      await environmentTreeProvider.add(userList);
    }
  }
}

function getTreeViewItemIcon(envName: string, activeEnv: string | undefined) {
  switch (envName) {
    case activeEnv:
      return "folder-active";
    case LocalEnvironment:
    // return "lock";
    default:
      return "symbol-folder";
  }
}

async function localSettingsExists(projectRoot: string): Promise<boolean> {
  const provider = new LocalSettingsProvider(projectRoot);
  return await fs.pathExists(provider.localSettingsFilePath);
}

export async function addSubscriptionAndResourceGroupNode(env: string) {
  if (!environmentTreeProvider) {
    return;
  }

  const parentCommand = environmentTreeProvider.findCommand("fx-extension.environment." + env);
  if (!parentCommand) {
    return;
  }

  const envSubItems: TreeItem[] = [];
  const subscriptionInfo = await getSubscriptionInfoFromEnv(env);
  if (subscriptionInfo) {
    const subscriptionTreeItem: TreeItem = {
      commandId: `fx-extension.environment.${env}.subscription`,
      label: subscriptionInfo.subscriptionName,
      icon: "key",
      isCustom: false,
      parent: "fx-extension.environment." + env,
    };

    envSubItems.push(subscriptionTreeItem);
  }

  const resourceGroupName = await getResourceGroupNameFromEnv(env);
  if (resourceGroupName) {
    const resourceGroupTreeItem: TreeItem = {
      commandId: `fx-extension.environment.${env}.resourceGroup`,
      label: resourceGroupName,
      icon: "symbol-method",
      isCustom: false,
      parent: `fx-extension.environment.${env}.subscription`,
    };

    envSubItems.push(resourceGroupTreeItem);
  }

  await environmentTreeProvider.add(envSubItems);
}
