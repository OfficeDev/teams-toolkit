// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureScopes, featureFlagManager, FeatureFlags } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";
import { AccountItemStatus, loadingIcon, m365Icon } from "./common";
import { CopilotNode } from "./copilotNode";
import { SideloadingNode } from "./sideloadingNode";
import { tools } from "../../globalVariables";
import { listAllTenants } from "@microsoft/teamsfx-core/build/common/tools";

export class M365AccountNode extends DynamicNode {
  public status: AccountItemStatus;
  private sideloadingNode: SideloadingNode;
  private copilotNode: CopilotNode | undefined;
  private tid: string | undefined;

  constructor(private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinM365";
    this.sideloadingNode = new SideloadingNode(this.eventEmitter, "");
    this.copilotNode = new CopilotNode(this.eventEmitter, "");
  }

  public async setSignedIn(displayName: string, tid: string) {
    if (this.status === AccountItemStatus.SignedIn && this.tid && this.tid === tid) {
      return;
    }
    this.status = AccountItemStatus.SignedIn;

    this.label = displayName;
    if (featureFlagManager.getBooleanValue(FeatureFlags.MultiTenant)) {
      const tokenRes = await tools.tokenProvider.m365TokenProvider.getAccessToken({
        scopes: AzureScopes,
      });
      if (tokenRes.isOk() && tokenRes.value) {
        const tenants = await listAllTenants(tokenRes.value);
        for (const tenant of tenants) {
          if (tenant.tenantId === tid && tenant.displayName) {
            this.label = `${displayName} (${tenant.displayName as string})`;
            this.tid = tid;
          }
        }
      }
    }
    this.contextValue = "signedinM365";
    // refresh
    this.eventEmitter.fire(undefined);
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
    this.contextValue = "signinM365";
    // refresh
    this.eventEmitter.fire(undefined);
  }

  public setSwitching() {
    if (this.status === AccountItemStatus.Switching) {
      return;
    }
    this.status = AccountItemStatus.Switching;
    this.contextValue = "";
    // refresh
    this.eventEmitter.fire(undefined);
  }

  public updateChecks(token: string, sideloading: boolean, copilot: boolean) {
    let refreshSideloading = false;
    let refreshCopilot = false;
    if (sideloading) {
      this.sideloadingNode.token = token;
      refreshSideloading = true;
    }
    if (copilot && this.copilotNode !== undefined) {
      this.copilotNode.token = token;
      refreshCopilot = true;
    }

    // partial refresh
    if (refreshSideloading && refreshCopilot) {
      this.eventEmitter.fire(undefined);
    } else if (refreshSideloading && !refreshCopilot) {
      this.eventEmitter.fire(undefined);
    } else if (!refreshSideloading && refreshCopilot) {
      this.eventEmitter.fire(undefined);
    }
  }

  public override getChildren(): vscode.ProviderResult<DynamicNode[]> {
    return this.copilotNode !== undefined
      ? [this.sideloadingNode, this.copilotNode]
      : [this.sideloadingNode];
  }

  public override getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    if (this.status !== AccountItemStatus.SignedIn) {
      this.label = localize("teamstoolkit.handlers.signIn365");
      this.command = {
        title: this.label,
        command: "fx-extension.signinM365",
        arguments: [TelemetryTriggerFrom.TreeView, this],
      };
    } else if (this.sideloadingNode.token !== "") {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    this.tooltip = new vscode.MarkdownString(
      localize("teamstoolkit.accountTree.m365AccountTooltip")
    );
    if (
      this.status === AccountItemStatus.SigningIn ||
      this.status === AccountItemStatus.Switching
    ) {
      this.iconPath = loadingIcon;
      this.label =
        this.status === AccountItemStatus.Switching
          ? localize("teamstoolkit.accountTree.switchingM365")
          : localize("teamstoolkit.accountTree.signingInM365");
    } else {
      this.iconPath = m365Icon;
    }
    return this;
  }
}
