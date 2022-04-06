// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as util from "util";
import * as vscode from "vscode";

import { LocalEnvironmentName, SubscriptionInfo } from "@microsoft/teamsfx-api";

import { AppStudioLogin } from "../commonlib/appStudioLogin";
import AzureAccountManager from "../commonlib/azureLogin";
import { signedIn } from "../commonlib/common/constant";
import { ext } from "../extensionVariables";
import {
  getM365TenantFromEnv,
  getProvisionSucceedFromEnv,
  getResourceGroupNameFromEnv,
  getSubscriptionInfoFromEnv,
  isExistingTabApp,
  isSPFxProject,
} from "../utils/commonUtils";
import { localize } from "../utils/localizeUtils";
import { DynamicNode } from "./dynamicNode";

enum EnvInfo {
  Local = "local",
  LocalForExistingApp = "local-existing-app",
  RemoteEnv = "environment",
  ProvisionedRemoteEnv = "environment-provisioned",
}

interface accountStatus {
  isOk: boolean;
  warnings: string[];
}

const provisionedIcon = new vscode.ThemeIcon("folder-active");
const nonProvisionedIcon = new vscode.ThemeIcon("symbol-folder");
const warningIcon = new vscode.ThemeIcon("warning");
const subscriptionIcon = new vscode.ThemeIcon("key");
const resourceGroupIcon = new vscode.ThemeIcon("symbol-method");

export class EnvironmentNode extends DynamicNode {
  constructor(public identifier: string) {
    super(identifier, vscode.TreeItemCollapsibleState.None);
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    const children: DynamicNode[] = [];
    if (this.identifier !== LocalEnvironmentName) {
      // check account status
      const accountStatus = await this.checkAccountForEnvironment(this.identifier);
      if (!accountStatus.isOk) {
        const warningNode = new WarningNode(this.identifier, accountStatus.warnings);
        children.push(warningNode);
      }
      // show subscription
      const subscriptionInfo = await getSubscriptionInfoFromEnv(this.identifier);
      if (subscriptionInfo) {
        const subscriptionNode = new SubscriptionNode(this.identifier, subscriptionInfo);
        children.push(subscriptionNode);
      }
    }
    return children;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    const envInfo = await this.getCurrentEnvInfo(this.identifier);
    const isSpfxProject = await isSPFxProject(ext.workspaceUri.fsPath);

    this.iconPath = envInfo === EnvInfo.ProvisionedRemoteEnv ? provisionedIcon : nonProvisionedIcon;
    this.collapsibleState =
      envInfo === EnvInfo.Local || envInfo === EnvInfo.LocalForExistingApp || isSpfxProject
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Expanded;
    this.description = envInfo === EnvInfo.ProvisionedRemoteEnv ? "(Provisioned)" : "";
    this.contextValue = envInfo;
    if (this.identifier !== LocalEnvironmentName) {
      await ext.activated;
    }
    return this;
  }

  private async checkAccountForEnvironment(env: string): Promise<accountStatus> {
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

  // Get the environment info for the given environment name.
  private async getCurrentEnvInfo(envName: string): Promise<EnvInfo> {
    if (envName === LocalEnvironmentName) {
      return (await isExistingTabApp(ext.workspaceUri.fsPath))
        ? EnvInfo.LocalForExistingApp
        : EnvInfo.Local;
    } else {
      const provisionSucceeded = await getProvisionSucceedFromEnv(envName);
      return provisionSucceeded ? EnvInfo.ProvisionedRemoteEnv : EnvInfo.RemoteEnv;
    }
  }
}

class WarningNode extends DynamicNode {
  constructor(public identifier: string, warnings: string[]) {
    super(identifier, vscode.TreeItemCollapsibleState.None);
    this.label = `Sign in with your correct Azure / M365 account`;
    this.iconPath = warningIcon;
    this.tooltip = this.formatWarningMessages(warnings);
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    return null;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    return this;
  }

  private formatWarningMessages(warnings: string[]): string {
    let warningMessage = "";
    if (warnings.length > 1) {
      const formattedWarnings = warnings.map((warning) => "> ".concat(warning));
      warningMessage = formattedWarnings.join("\n");
    } else {
      warningMessage = warnings[0];
    }

    return warningMessage;
  }
}

class SubscriptionNode extends DynamicNode {
  private resourceGroupNode?: ResourceGroupNode;
  constructor(public identifier: string, private subscriptionInfo: SubscriptionInfo) {
    super(identifier, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "openSubscriptionInPortal";
    this.iconPath = subscriptionIcon;
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    if (this.resourceGroupNode) {
      return [this.resourceGroupNode];
    }
    return null;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    this.tooltip = this.subscriptionInfo.subscriptionName
      ? util.format(
          localize("teamstoolkit.envTree.subscriptionTooltip"),
          this.identifier,
          this.subscriptionInfo.subscriptionName,
          this.subscriptionInfo.subscriptionId
        )
      : util.format(
          localize("teamstoolkit.envTree.subscriptionTooltipWithoutName"),
          this.identifier,
          this.subscriptionInfo.subscriptionId
        );
    this.label = this.subscriptionInfo.subscriptionName ?? this.subscriptionInfo.subscriptionId;
    this.description = this.subscriptionInfo.subscriptionId;

    const resourceGroupName = await getResourceGroupNameFromEnv(this.identifier);
    if (resourceGroupName) {
      this.resourceGroupNode = new ResourceGroupNode(this.identifier, resourceGroupName);
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    } else {
      this.resourceGroupNode = undefined;
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }

    return this;
  }
}

class ResourceGroupNode extends DynamicNode {
  constructor(public identifier: string, private resourceGroup: string) {
    super(resourceGroup, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "openResourceGroupInPortal";
    this.iconPath = resourceGroupIcon;
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    return null;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    return this;
  }
}
