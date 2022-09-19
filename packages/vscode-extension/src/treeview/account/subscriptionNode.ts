// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as util from "util";
import * as vscode from "vscode";

import { SubscriptionInfo } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

import { workspaceUri } from "../../globalVariables";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";
import { infoIcon, keyIcon, warningIcon } from "./common";

export class SubscriptionNode extends DynamicNode {
  private subscription?: SubscriptionInfo;
  constructor(private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>) {
    super("", vscode.TreeItemCollapsibleState.None);
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    return null;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    if (this.subscription) {
      this.label = this.subscription.subscriptionName;
      this.tooltip = this.subscription.subscriptionName;
      this.contextValue = "selectSubscription";
      this.iconPath = keyIcon;
    }
    return this;
  }

  public async setSubscription(subscription: SubscriptionInfo) {
    this.subscription = subscription;
    this.eventEmitter.fire(this);
  }

  public unsetSubscription(subscriptionCount: number) {
    this.subscription = undefined;
    this.label = util.format(
      localize("teamstoolkit.accountTree.totalSubscriptions"),
      subscriptionCount
    );
    this.tooltip = undefined;
    this.contextValue = "selectSubscription";
    this.iconPath = infoIcon;
    this.eventEmitter.fire(this);
  }

  public setEmptySubscription() {
    this.subscription = undefined;
    const validProject = isValidProject(workspaceUri?.fsPath);
    this.contextValue = validProject ? "emptySubscription" : "invalidFxProject";
    this.label = localize("teamstoolkit.accountTree.noSubscriptions");
    this.tooltip = localize("teamstoolkit.accountTree.noSubscriptionsTooltip");
    this.iconPath = warningIcon;
    this.eventEmitter.fire(this);
  }
}
