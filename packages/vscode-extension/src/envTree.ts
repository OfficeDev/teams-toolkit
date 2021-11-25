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
  LocalEnvironmentName,
} from "@microsoft/teamsfx-api";
import {
  isMultiEnvEnabled,
  environmentManager,
  isRemoteCollaborateEnabled,
  LocalSettingsProvider,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import * as util from "util";
import { CommandsTreeViewProvider } from "./treeview/commandsTreeViewProvider";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import * as StringResources from "./resources/Strings.json";
import { checkPermission, listAllCollaborators, tools } from "./handlers";
import { signedIn } from "./commonlib/common/constant";
import { AppStudioLogin } from "./commonlib/appStudioLogin";
import * as fs from "fs-extra";
import {
  getProvisionSucceedFromEnv,
  getM365TenantFromEnv,
  getResourceGroupNameFromEnv,
  getSubscriptionInfoFromEnv,
  isSPFxProject,
} from "./utils/commonUtils";
import AzureAccountManager from "./commonlib/azureLogin";
import { Mutex } from "async-mutex";
import { ext } from "./extensionVariables";

const showEnvList: Array<string> = [];
let environmentTreeProvider: CommandsTreeViewProvider;
let collaboratorsRecordCache: Record<string, TreeItem[]> = {};
let permissionCache: Record<string, boolean> = {};
const mutex = new Mutex();

interface accountStatus {
  isOk: boolean;
  warnings: string[];
}

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

      const envNames = [LocalEnvironmentName].concat(envNamesResult.value);
      for (const item of envNames) {
        showEnvList.push(item);
        const provisionSucceeded = await getProvisionSucceedFromEnv(item);
        const isLocal = item === LocalEnvironmentName;

        let contextValue = "environment";

        if (isLocal) {
          contextValue = "local";
        } else {
          if (await isSPFxProject(workspacePath)) {
            contextValue = "spfx-" + contextValue;
          } else {
            contextValue = "azure-" + contextValue;
          }

          if (provisionSucceeded) {
            contextValue = contextValue + "-provisioned";
          }
        }

        environmentTreeProvider.add([
          {
            commandId: "fx-extension.environment." + item,
            label: item,
            description: provisionSucceeded ? "(Provisioned)" : "",
            parent: TreeCategory.Environment,
            contextValue: contextValue,
            icon: provisionSucceeded ? "folder-active" : "symbol-folder",
            isCustom: false,
            expanded: isLocal ? undefined : true,
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
    await appendWarningItem(item);
    await appendSubscriptionAndResourceGroupNode(item);
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

async function appendSubscriptionAndResourceGroupNode(env: string): Promise<void> {
  if (
    environmentTreeProvider &&
    environmentTreeProvider.findCommand("fx-extension.environment." + env) &&
    env !== LocalEnvironmentName
  ) {
    const envSubItems: TreeItem[] = [];
    const subscriptionInfo = await getSubscriptionInfoFromEnv(env);
    if (subscriptionInfo) {
      const subscriptionTreeItem: TreeItem = {
        commandId: `fx-extension.environment.subscription.${env}`,
        contextValue: "openSubscriptionInPortal",
        label: subscriptionInfo.subscriptionName ?? subscriptionInfo.subscriptionId,
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
    }

    await environmentTreeProvider.add(envSubItems);
  }
}

function formatWarningMessages(warnings: string[]): string {
  let warningMessage = "";
  if (warnings.length > 1) {
    const formatedWarnings = warnings.map((warning) => "> ".concat(warning));
    warningMessage = formatedWarnings.join("\n");
  } else {
    warningMessage = warnings[0];
  }

  return warningMessage;
}

async function checkAccountForEnvrironment(env: string): Promise<accountStatus | undefined> {
  if (env === LocalEnvironmentName) {
    return undefined;
  }

  let checkResult = true;
  const warnings: string[] = [];

  // Check M365 account status
  const loginStatus = await AppStudioLogin.getInstance().getStatus();
  if (loginStatus.status == signedIn) {
    // Signed account doesn't match
    const m365TenantId = await getM365TenantFromEnv(env);
    if (m365TenantId && (loginStatus.accountInfo as any).tid !== m365TenantId) {
      checkResult = false;
      warnings.push(StringResources.vsc.commandsTreeViewProvider.m365AccountNotMatch);
    }
  } else {
    // Not signed in
    checkResult = false;
    warnings.push(StringResources.vsc.commandsTreeViewProvider.m365AccountNotSignedIn);
  }

  // Check Azure account status
  const isSpfxProject = await isSPFxProject(ext.workspaceUri.fsPath);
  if (!isSpfxProject) {
    if (AzureAccountManager.getAccountInfo() !== undefined) {
      const subscriptionInfo = await getSubscriptionInfoFromEnv(env);
      const provisionedSubId = subscriptionInfo?.subscriptionId;

      if (provisionedSubId) {
        const subscriptions: SubscriptionInfo[] = await AzureAccountManager.listSubscriptions();
        const targetSub = subscriptions.find(
          (sub) => sub.subscriptionId === subscriptionInfo?.subscriptionId
        );
        if (targetSub === undefined) {
          checkResult = false;
          warnings.push(
            util.format(
              StringResources.vsc.commandsTreeViewProvider.azureAccountNotMatch,
              subscriptionInfo?.subscriptionName ?? subscriptionInfo?.subscriptionId
            )
          );
        }
      }
    } else {
      checkResult = false;
      warnings.push(StringResources.vsc.commandsTreeViewProvider.azureAccountNotSignedIn);
    }
  }

  return {
    isOk: checkResult,
    warnings: warnings,
  };
}

async function appendWarningItem(env: string): Promise<void> {
  const checkResult = await checkAccountForEnvrironment(env);

  if (checkResult !== undefined && !checkResult.isOk) {
    const warningTreeItem: TreeItem = {
      commandId: `fx-extension.environment.accountStatus.${env}`,
      label: `Sign in with your correct Azure / M365 account`,
      tooltip: {
        value: formatWarningMessages(checkResult.warnings),
        isMarkdown: false,
      },
      icon: "warning",
      isCustom: false,
      parent: `fx-extension.environment.${env}`,
    };

    await environmentTreeProvider.add([warningTreeItem]);
  }
}
