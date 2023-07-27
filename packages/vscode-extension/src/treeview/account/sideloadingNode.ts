// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { getSideloadingStatus } from "@microsoft/teamsfx-core";

import { checkSideloadingCallback } from "../../handlers";
import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";
import { errorIcon, passIcon, warningIcon } from "./common";

export class SideloadingNode extends DynamicNode {
  constructor(
    private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>,
    public token: string
  ) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.contextValue = "checkSideloading";
  }

  public override getChildren(): vscode.ProviderResult<DynamicNode[]> {
    return null;
  }

  public override async getTreeItem(): Promise<vscode.TreeItem> {
    let isSideloadingAllowed: boolean | undefined;
    if (this.token != "") {
      isSideloadingAllowed = await getSideloadingStatus(this.token);
      if (isSideloadingAllowed === false) {
        await checkSideloadingCallback();
      }
    }
    if (isSideloadingAllowed === undefined) {
      this.label = localize("teamstoolkit.accountTree.sideloadingStatusUnknown");
      this.iconPath = warningIcon;
      this.tooltip = localize("teamstoolkit.accountTree.sideloadingStatusUnknownTooltip");
    } else if (isSideloadingAllowed) {
      this.label = localize("teamstoolkit.accountTree.sideloadingPass");
      this.iconPath = passIcon;
      this.tooltip = localize("teamstoolkit.accountTree.sideloadingPassTooltip");
    } else {
      this.label = localize("teamstoolkit.accountTree.sideloadingWarning");
      this.iconPath = errorIcon;
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
