// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { SubscriptionInfo } from "@microsoft/teamsfx-api";
import { isV3Enabled } from "@microsoft/teamsfx-core";

import AzureAccountManager from "../../commonlib/azureLogin";
import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";
import { AccountItemStatus, azureIcon, loadingIcon } from "./common";
import { SubscriptionNode } from "./subscriptionNode";

export class AzureAccountNode extends DynamicNode {
  public status: AccountItemStatus;
  private subscriptionNode: SubscriptionNode;

  constructor(private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinAzure";
    this.subscriptionNode = new SubscriptionNode(this.eventEmitter);
  }

  public async setSignedIn(upn: string) {
    if (this.status === AccountItemStatus.SignedIn) {
      return false;
    }
    this.status = AccountItemStatus.SignedIn;
    this.label = upn;
    this.contextValue = "signedinAzure";
    if (isV3Enabled()) {
      this.eventEmitter.fire(this);
      return false;
    } else {
      const needManualSelection = await this.autoSelectSubscription();
      // refresh
      this.eventEmitter.fire(this);
      return needManualSelection;
    }
  }

  public setSigningIn() {
    if (this.status === AccountItemStatus.SigningIn) {
      return;
    }
    this.status = AccountItemStatus.SigningIn;
    this.contextValue = "";
    // refresh
    this.eventEmitter.fire(this);
  }

  public setSignedOut() {
    if (this.status === AccountItemStatus.SignedOut) {
      return;
    }
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinAzure";
    // refresh
    this.eventEmitter.fire(this);
  }

  public async setSubscription(subscription: SubscriptionInfo | undefined) {
    if (subscription) {
      this.subscriptionNode.setSubscription(subscription);
    }
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    if (isV3Enabled()) {
      // No subscription info in V3
      return null;
    }
    return [this.subscriptionNode];
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    if (this.status === AccountItemStatus.SigningIn) {
      this.iconPath = loadingIcon;
    } else {
      this.iconPath = azureIcon;
    }
    if (this.status === AccountItemStatus.SignedIn) {
      if (isV3Enabled()) {
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
      } else {
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      }
      this.command = undefined;
    } else if (this.status === AccountItemStatus.SigningIn) {
      this.label = localize("teamstoolkit.accountTree.signingInAzure");
    } else {
      this.label = localize("teamstoolkit.handlers.signInAzure");
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
      this.command = {
        title: this.label,
        command: "fx-extension.signinAzure",
        arguments: [TelemetryTriggerFrom.TreeView, this],
      };
    }
    this.tooltip = new vscode.MarkdownString(
      localize("teamstoolkit.accountTree.azureAccountTooltip")
    );

    return this;
  }

  private async autoSelectSubscription(): Promise<boolean> {
    const subscriptions: SubscriptionInfo[] = await AzureAccountManager.listSubscriptions();
    let activeSubscriptionId: string | undefined;
    const subscriptionInfo = await AzureAccountManager.getSelectedSubscription();
    if (subscriptionInfo) {
      activeSubscriptionId = subscriptionInfo.subscriptionId;
    }
    const activeSubscription = subscriptions.find(
      (subscription) => subscription.subscriptionId === activeSubscriptionId
    );
    if (activeSubscriptionId === undefined || activeSubscription === undefined) {
      if (subscriptions.length === 0) {
        this.subscriptionNode.setEmptySubscription();
      } else if (subscriptions.length === 1) {
        await this.subscriptionNode.setSubscription(subscriptions[0]);
        await AzureAccountManager.setSubscription(subscriptions[0].subscriptionId);
      } else {
        this.subscriptionNode.unsetSubscription(subscriptions.length);
      }
    } else if (activeSubscription) {
      await this.subscriptionNode.setSubscription(activeSubscription);
      await AzureAccountManager.setSubscription(activeSubscription.subscriptionId);
    }
    return (
      (activeSubscriptionId === undefined || activeSubscription === undefined) &&
      subscriptions.length > 1
    );
  }
}
