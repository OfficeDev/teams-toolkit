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
  ConfigFolderName,
  InputConfigsFolderName,
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import { environmentManager } from "@microsoft/teamsfx-core";

import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import * as util from "util";
import { CommandsTreeViewProvider } from "./treeview/commandsTreeViewProvider";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { signedIn } from "./commonlib/common/constant";
import { AppStudioLogin } from "./commonlib/appStudioLogin";
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
import { localize } from "./utils/localizeUtils";

const showEnvList: Array<string> = [];
let environmentTreeProvider: CommandsTreeViewProvider;
const mutex = new Mutex();

interface accountStatus {
  isOk: boolean;
  warnings: string[];
}

enum EnvInfo {
  Local = "local",
  LocalForExistingApp = "local-existing-app",
  RemoteEnv = "environment",
  ProvisionedRemoteEnv = "environment-provisioned",
}

export async function registerEnvTreeHandler(): Promise<Result<Void, FxError>> {
  if (vscode.workspace.workspaceFolders) {
    await mutex.runExclusive(async () => {
      const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders![0];
      const workspacePath: string = workspaceFolder.uri.fsPath;
      const envNamesResult = await environmentManager.listRemoteEnvConfigs(workspacePath);
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
        const envInfo = await getCurrentEnvInfo(workspacePath, item);
        const isSpfxProject = isSPFxProject(ext.workspaceUri.fsPath);

        environmentTreeProvider.add([
          {
            commandId: "fx-extension.environment." + item,
            label: item,
            description: envInfo === EnvInfo.ProvisionedRemoteEnv ? "(Provisioned)" : "",
            parent: TreeCategory.Environment,
            contextValue: envInfo,
            icon: envInfo === EnvInfo.ProvisionedRemoteEnv ? "folder-active" : "symbol-folder",
            isCustom: false,
            expanded:
              envInfo === EnvInfo.Local || envInfo === EnvInfo.LocalForExistingApp || isSpfxProject
                ? undefined
                : true,
          },
        ]);
      }

      await checkAllEnv(envNamesResult.value);
    });
  }
  return ok(Void);
}

// Get the environment info for the given environment name.
async function getCurrentEnvInfo(workspacePath: string, envName: string): Promise<EnvInfo> {
  const provisionSucceeded = await getProvisionSucceedFromEnv(envName);

  if (envName === LocalEnvironmentName) {
    return (await isExistingApp(workspacePath)) ? EnvInfo.LocalForExistingApp : EnvInfo.Local;
  } else if (provisionSucceeded) {
    return EnvInfo.ProvisionedRemoteEnv;
  } else {
    return EnvInfo.RemoteEnv;
  }
}

async function isExistingApp(workspacePath: string): Promise<boolean> {
  // Check if solution settings is empty.
  const projectSettingsPath = path.resolve(
    workspacePath,
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    ProjectSettingsFileName
  );

  if (await fs.pathExists(projectSettingsPath)) {
    const projectSettings = await fs.readJson(projectSettingsPath);
    return !projectSettings.solutionSettings;
  } else {
    return false;
  }
}

async function checkAllEnv(itemList: Array<string>) {
  for (const item of itemList) {
    await appendWarningItem(item);
    await appendSubscriptionAndResourceGroupNode(item);
  }
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
        description: subscriptionInfo.subscriptionId,
        tooltip: {
          isMarkdown: false,
          value: subscriptionInfo.subscriptionName
            ? util.format(
                localize("teamstoolkit.envTree.subscriptionTooltip"),
                env,
                subscriptionInfo.subscriptionName,
                subscriptionInfo.subscriptionId
              )
            : util.format(
                localize("teamstoolkit.envTree.subscriptionTooltipWithoutName"),
                env,
                subscriptionInfo.subscriptionId
              ),
        },
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
    const formattedWarnings = warnings.map((warning) => "> ".concat(warning));
    warningMessage = formattedWarnings.join("\n");
  } else {
    warningMessage = warnings[0];
  }

  return warningMessage;
}

async function checkAccountForEnvironment(env: string): Promise<accountStatus | undefined> {
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
      warnings.push(localize("teamstoolkit.commandsTreeViewProvider.m365AccountNotMatch"));
    }
  } else {
    // Not signed in
    checkResult = false;
    warnings.push(localize("teamstoolkit.commandsTreeViewProvider.m365AccountNotSignedIn"));
  }

  // Check Azure account status
  const isSpfxProject = isSPFxProject(ext.workspaceUri.fsPath);
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
              localize("teamstoolkit.commandsTreeViewProvider.azureAccountNotMatch"),
              subscriptionInfo?.subscriptionName ?? subscriptionInfo?.subscriptionId
            )
          );
        }
      }
    } else {
      checkResult = false;
      warnings.push(localize("teamstoolkit.commandsTreeViewProvider.azureAccountNotSignedIn"));
    }
  }

  return {
    isOk: checkResult,
    warnings: warnings,
  };
}

async function appendWarningItem(env: string): Promise<void> {
  const checkResult = await checkAccountForEnvironment(env);

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
