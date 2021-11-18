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
  isRemoteCollaborateEnabled,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import { CommandsTreeViewProvider } from "./treeview/commandsTreeViewProvider";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import * as StringResources from "./resources/Strings.json";
import { checkPermission, listAllCollaborators, tools } from "./handlers";
import { signedIn } from "./commonlib/common/constant";
import { AppStudioLogin } from "./commonlib/appStudioLogin";
import {
  getProvisionSucceedFromEnv,
  getM365TenantFromEnv,
  getResourceGroupNameFromEnv,
  getSubscriptionInfoFromEnv,
} from "./utils/commonUtils";
import AzureAccountManager from "./commonlib/azureLogin";
import { Mutex } from "async-mutex";

const showEnvList: Array<string> = [];
let environmentTreeProvider: CommandsTreeViewProvider;
let collaboratorsRecordCache: Record<string, TreeItem[]> = {};
let permissionCache: Record<string, boolean> = {};
const mutex = new Mutex();

export async function registerEnvTreeHandler(
  forceUpdateCollaboratorList = true
): Promise<Result<Void, FxError>> {
  if (isMultiEnvEnabled() && vscode.workspace.workspaceFolders) {
    await mutex.runExclusive(async () => {
      const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders![0];
      const workspacePath: string = workspaceFolder.uri.fsPath;
      const envNamesResult = await environmentManager.listEnvConfigs(workspacePath);
      if (envNamesResult.isErr()) {
        return err(envNamesResult.error);
      }
      environmentTreeProvider = TreeViewManagerInstance.getTreeView("teamsfx-environment")!;
      if (showEnvList.length > 0) {
        showEnvList.forEach(async (item) => {
          environmentTreeProvider.removeById("fx-extension.environment." + item);
        });
      }
      showEnvList.splice(0);

      const envNames = envNamesResult.value;
      for (const item of envNames) {
        showEnvList.push(item);
        const provisionSucceeded = await getProvisionSucceedFromEnv(item);
        environmentTreeProvider.add([
          {
            commandId: "fx-extension.environment." + item,
            label: item,
            description: provisionSucceeded ? "(Provisioned)" : "",
            parent: TreeCategory.Environment,
            contextValue: "environment",
            icon: provisionSucceeded ? "folder-active" : "symbol-folder",
            isCustom: false,
            expanded: true,
          },
        ]);
      }
      await checkAllEnv(envNamesResult.value);

      // Remove collaborators node in tree view, and temporary keep this code which will be used for future implementation
      /*
      const collaboratorsItem = await getAllCollaboratorList(
        envNamesResult.value,
        forceUpdateCollaboratorList
      );
      await environmentTreeProvider.add(collaboratorsItem);
      */
    });
  }
  return ok(Void);
}

async function checkAllEnv(itemList: Array<string>) {
  for (const item of itemList) {
    let envSubItems: TreeItem[] = [];

    envSubItems = envSubItems.concat(await getSubscriptionAndResourceGroupNode(item));
    await environmentTreeProvider.add(envSubItems);
  }
}

export async function getAllCollaboratorList(envs: string[], force = false): Promise<TreeItem[]> {
  let result: TreeItem[] = [];

  if (environmentTreeProvider && isRemoteCollaborateEnabled()) {
    const loginStatus = await AppStudioLogin.getInstance().getStatus();

    if (force || loginStatus.status !== signedIn) {
      collaboratorsRecordCache = {};
      permissionCache = {};
    }

    const collaboratorsRecord =
      Object.keys(collaboratorsRecordCache).length > 0 || loginStatus.status !== signedIn
        ? collaboratorsRecordCache
        : await listAllCollaborators(envs);
    collaboratorsRecordCache = collaboratorsRecord;

    for (const env of envs) {
      const collaboratorParentNode: TreeItem = generateCollaboratorParentNode(env);

      result.push(collaboratorParentNode);

      if (loginStatus.status === signedIn) {
        const canAddCollaborator = permissionCache[env] ?? (await checkPermission(env));
        permissionCache[env] = canAddCollaborator;
        if (canAddCollaborator) {
          collaboratorParentNode.contextValue = "addCollaborator";
        }

        if (collaboratorsRecord[env]) {
          result = result.concat(collaboratorsRecord[env]);
        }
      } else {
        result.push(
          generateCollaboratorWarningNode(
            env,
            StringResources.vsc.commandsTreeViewProvider.loginM365AccountToViewCollaborators,
            undefined,
            false
          )
        );
      }
    }
  }
  return result;
}

export async function updateNewEnvCollaborators(env: string): Promise<void> {
  await mutex.runExclusive(async () => {
    const parentNode = generateCollaboratorParentNode(env);
    const notProvisionedNode = generateCollaboratorWarningNode(
      env,
      StringResources.vsc.commandsTreeViewProvider.unableToFindTeamsAppRegistration,
      undefined,
      false
    );

    collaboratorsRecordCache[env] = [parentNode, notProvisionedNode];
    await environmentTreeProvider.add(collaboratorsRecordCache[env]);
  });
}

export async function addCollaboratorToEnv(
  env: string,
  userObjectId: string,
  email: string
): Promise<void> {
  const findDuplicated = collaboratorsRecordCache[env].find(
    (collaborator) => collaborator.label === email
  );
  if (findDuplicated) {
    return;
  }
  const newCollaborator = generateCollaboratorNode(env, userObjectId, email, true);
  collaboratorsRecordCache[env].push(newCollaborator);
  await environmentTreeProvider.add([newCollaborator]);
}

export function generateCollaboratorNode(
  env: string,
  userObjectId: string,
  email: string,
  isAadOwner: boolean
): TreeItem {
  return {
    commandId: `fx-extension.listcollaborator.${env}.${userObjectId}`,
    label: email,
    icon: isAadOwner ? "person" : "warning",
    isCustom: !isAadOwner,
    tooltip: {
      value: isAadOwner ? "" : "This account doesn't have the AAD permission.",
      isMarkdown: false,
    },
    parent: `fx-extension.listcollaborator.parentNode.${env}`,
  };
}

export function generateCollaboratorWarningNode(
  env: string,
  nodeLabel: string,
  toolTip?: string,
  showWarning?: boolean
): TreeItem {
  return {
    commandId: `fx-extension.listcollaborator.${env}`,
    label: nodeLabel,
    icon: showWarning ? "warning" : "",
    tooltip: {
      value: toolTip ?? nodeLabel,
      isMarkdown: false,
    },
    isCustom: true,
    parent: `fx-extension.listcollaborator.parentNode.${env}`,
  };
}

function generateCollaboratorParentNode(env: string): TreeItem {
  return {
    commandId: `fx-extension.listcollaborator.parentNode.${env}`,
    label: StringResources.vsc.commandsTreeViewProvider.collaboratorParentNode,
    icon: "organization",
    isCustom: false,
    parent: "fx-extension.environment." + env,
    expanded: false,
  };
}

async function getSubscriptionAndResourceGroupNode(env: string): Promise<TreeItem[]> {
  if (
    environmentTreeProvider &&
    environmentTreeProvider.findCommand("fx-extension.environment." + env)
  ) {
    let envSubItems: TreeItem[] = [];
    const subscriptionInfo = await getSubscriptionInfoFromEnv(env);
    if (subscriptionInfo) {
      const subscriptionTreeItem: TreeItem = {
        commandId: `fx-extension.environment.subscription.${env}`,
        contextValue: "openSubscriptionInPortal",
        label: subscriptionInfo.subscriptionName,
        icon: "key",
        isCustom: false,
        parent: "fx-extension.environment." + env,
      };

      envSubItems.push(subscriptionTreeItem);

      const resourceGroupName = await getResourceGroupNameFromEnv(env);
      if (resourceGroupName) {
        const resourceGroupTreeItem: TreeItem = {
          commandId: `fx-extension.environment.resourceGroup.${env}`,
          contextValue: "openResourceGroupInPortal",
          label: resourceGroupName,
          icon: "symbol-method",
          isCustom: false,
          parent: `fx-extension.environment.subscription.${env}`,
        };

        envSubItems.push(resourceGroupTreeItem);
      }

      const warningItem = await checkSubscriptionPermission(env, subscriptionInfo.subscriptionId);
      if (warningItem) {
        envSubItems = [warningItem].concat(envSubItems);
      }
    }

    const m365TenantId = await getM365TenantFromEnv(env);
    if (m365TenantId) {
      const warningItem = await checkM365Permission(env, m365TenantId);
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
      commandId: `fx-extension.environment.checkAzureAccount.${env}`,
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
        commandId: `fx-extension.environment.checkSubscription.${env}`,
        label: StringResources.vsc.commandsTreeViewProvider.azureAccountNotMatch,
        tooltip: {
          value: StringResources.vsc.commandsTreeViewProvider.noSubscriptionFoundInAzureAccount,
          isMarkdown: false,
        },
        icon: "warning",
        isCustom: true,
        parent: `fx-extension.environment.${env}`,
      };

      return warningTreeItem;
    }
  }

  return undefined;
}

async function checkM365Permission(
  env: string,
  m365TenantId: string
): Promise<TreeItem | undefined> {
  const loginStatus = await AppStudioLogin.getInstance().getStatus();
  if (loginStatus.status === signedIn) {
    let checkSucceeded = false;

    if ((loginStatus.accountInfo as any).tid === m365TenantId) {
      checkSucceeded = true;
    }

    if (!checkSucceeded) {
      const warningTreeItem: TreeItem = {
        commandId: `fx-extension.environment.${env}.checkM365Tenant`,
        label: StringResources.vsc.commandsTreeViewProvider.m365AccountNotMatch,
        tooltip: {
          value: StringResources.vsc.commandsTreeViewProvider.m365TenantNotMatch,
          isMarkdown: false,
        },
        icon: "warning",
        isCustom: true,
        parent: `fx-extension.environment.${env}`,
      };

      return warningTreeItem;
    }
  }

  return undefined;
}
