// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";
import { AccountItemStatus, azureIcon, loadingIcon } from "./common";

export class AzureAccountNode extends DynamicNode {
  public status: AccountItemStatus;

  constructor(private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinAzure";
  }

  public setSignedIn(upn: string) {
    if (this.status === AccountItemStatus.SignedIn && this.label === upn) {
      return false;
    }
    this.status = AccountItemStatus.SignedIn;
    this.label = upn;
    this.contextValue = "signedinAzure";
    this.eventEmitter.fire(undefined);
    return false;
  }

  public setSigningIn() {
    if (this.status === AccountItemStatus.SigningIn) {
      return;
    }
    this.status = AccountItemStatus.SigningIn;
    this.contextValue = "";
    // refresh
    this.eventEmitter.fire(undefined);
  }

  public setSignedOut() {
    if (this.status === AccountItemStatus.SignedOut) {
      return;
    }
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinAzure";
    // refresh
    this.eventEmitter.fire(undefined);
  }

  public override getChildren(): vscode.ProviderResult<DynamicNode[]> {
    // No subscription info in V3
    return null;
  }

  public override getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
    if (this.status === AccountItemStatus.SigningIn) {
      this.iconPath = loadingIcon;
    } else {
      this.iconPath = azureIcon;
    }
    if (this.status === AccountItemStatus.SignedIn) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
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
}
