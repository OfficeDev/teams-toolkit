// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  err,
  ok,
  Void,
  TreeCategory,
  TreeItem,
  SubscriptionInfo,
} from "@microsoft/teamsfx-api";
import {
  isMultiEnvEnabled,
  environmentManager,
  setActiveEnv,
  isRemoteCollaborateEnabled,
  LocalSettingsProvider,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import { CommandsTreeViewProvider } from "./treeview/commandsTreeViewProvider";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { LocalEnvironment } from "./constants";
import * as StringResources from "./resources/Strings.json";
import { checkPermission, listCollaborator, tools } from "./handlers";
import { signedIn } from "./commonlib/common/constant";
import { AppStudioLogin } from "./commonlib/appStudioLogin";
import * as fs from "fs-extra";
import { getResourceGroupNameFromEnv, getSubscriptionInfoFromEnv } from "./utils/commonUtils";
import AzureAccountManager from "./commonlib/azureLogin";

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
          expanded: activeEnv === item ? true : undefined,
        },
      ]);
    }

    for (const item of envNamesResult.value) {
      let envSubItems: TreeItem[] = [];

      const warningItem = checkAzureAccountStatus(item);
      if (warningItem) {
        envSubItems.push(warningItem);
      }

      envSubItems = envSubItems.concat(await getSubscriptionAndResourceGroupNode(item));
      envSubItems = envSubItems.concat(await getCollaboratorList(item));
      await environmentTreeProvider.add(envSubItems);
    }
  }
  return ok(Void);
}

export async function getCollaboratorList(env: string): Promise<TreeItem[]> {
  if (environmentTreeProvider && isRemoteCollaborateEnabled()) {
    const collaboratorParentNode: TreeItem = {
      commandId: `fx-extension.listcollaborator.parentNode.${env}`,
      label: StringResources.vsc.commandsTreeViewProvider.collaboratorParentNode,
      icon: "organization",
      isCustom: false,
      parent: "fx-extension.environment." + env,
      expanded: false,
    };

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
            parent: `fx-extension.listcollaborator.parentNode.${env}`,
          },
        ];
      }
    }

    return [collaboratorParentNode].concat(userList);
  } else {
    return [];
  }
}

export async function updateCollaboratorList(env: string): Promise<void> {
  const userList = await getCollaboratorList(env);
  if (userList && userList.length > 0) {
    await environmentTreeProvider.add(userList);
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

export async function getSubscriptionAndResourceGroupNode(env: string): Promise<TreeItem[]> {
  if (
    environmentTreeProvider &&
    environmentTreeProvider.findCommand("fx-extension.environment." + env) &&
    env !== LocalEnvironment
  ) {
    let envSubItems: TreeItem[] = [];
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

      const warningItem = await checkSubscriptionPermission(env, subscriptionInfo.subscriptionId);
      if (warningItem) {
        envSubItems = [warningItem].concat(envSubItems);
      }
    }

    return envSubItems;
  }

  return [];
}

function checkAzureAccountStatus(env: string): TreeItem | undefined {
  if (AzureAccountManager.getAccountInfo() === undefined) {
    return {
      commandId: `fx-extension.environment.${env}.checkAzureAccount`,
      label: StringResources.vsc.commandsTreeViewProvider.noAzureAccountSignedIn,
      icon: "warning",
      isCustom: true,
      parent: `fx-extension.environment.${env}`,
    };
  } else {
    return undefined;
  }
}

async function checkSubscriptionPermission(
  env: string,
  subscriptionId: string
): Promise<TreeItem | undefined> {
  if (tools.tokenProvider.azureAccountProvider.getAccountInfo()) {
    const subscriptions: SubscriptionInfo[] =
      await tools.tokenProvider.azureAccountProvider.listSubscriptions();

    let checkSucceeded = false;
    if (subscriptions) {
      const targetSub = subscriptions.find((sub) => sub.subscriptionId === subscriptionId);
      checkSucceeded = targetSub !== undefined;
    }

    if (!checkSucceeded) {
      const warningTreeItem: TreeItem = {
        commandId: `fx-extension.environment.${env}.checkSubscription`,
        label: StringResources.vsc.commandsTreeViewProvider.noSubscriptionFoundInAzureAccount,
        icon: "warning",
        isCustom: true,
        parent: `fx-extension.environment.${env}`,
      };

      return warningTreeItem;
    }
  }

  return undefined;
}
