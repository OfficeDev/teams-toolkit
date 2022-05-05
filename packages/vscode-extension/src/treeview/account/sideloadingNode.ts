// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import { getSideloadingStatus } from "@microsoft/teamsfx-core";

import { ext } from "../../extensionVariables";
import { checkSideloadingCallback } from "../../handlers";
import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";

export class SideloadingNode extends DynamicNode {
  constructor(
    private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>,
    public token: string
  ) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.contextValue = "checkSideloading";
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    return null;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    let isSideloadingAllowed: boolean | undefined;
    if (this.token != "") {
      isSideloadingAllowed = await getSideloadingStatus(this.token);
      if (isSideloadingAllowed === undefined) {
        // show nothing if internal error (TODO: may add back if full status is required later)
      } else {
        if (!isSideloadingAllowed) {
          await checkSideloadingCallback();
        }
      }
    }
    if (isSideloadingAllowed) {
      this.label = localize("teamstoolkit.accountTree.sideloadingPass");
      this.iconPath = {
        light: path.join(
          ext.context.extensionPath,
          "media",
          "treeview",
          "account",
          "sideloadingPass-light.svg"
        ),
        dark: path.join(
          ext.context.extensionPath,
          "media",
          "treeview",
          "account",
          "sideloadingPass-dark.svg"
        ),
      };
      this.tooltip = localize("teamstoolkit.accountTree.sideloadingPassTooltip");
    } else {
      this.label = localize("teamstoolkit.accountTree.sideloadingWarning");
      this.iconPath = {
        light: path.join(
          ext.context.extensionPath,
          "media",
          "treeview",
          "account",
          "sideloadingError-light.svg"
        ),
        dark: path.join(
          ext.context.extensionPath,
          "media",
          "treeview",
          "account",
          "sideloadingError-dark.svg"
        ),
      };
      this.tooltip = localize("teamstoolkit.accountTree.sideloadingWarningTooltip");
      this.command = {
        title: this.label,
        command: "fx-extension.checkSideloading",
        arguments: [TelemetryTriggerFrom.TreeView, this],
      };
    }
    return this;
  }
}
