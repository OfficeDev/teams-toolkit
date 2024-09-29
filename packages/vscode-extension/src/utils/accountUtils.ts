// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  AccountType,
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import { localize } from "./localizeUtils";
import accountTreeViewProviderInstance from "../treeview/account/accountTreeViewProvider";
import envTreeProviderInstance from "../treeview/environmentTreeViewProvider";
import M365TokenInstance from "../commonlib/m365Login";

export async function signInAzure() {
  await vscode.commands.executeCommand("fx-extension.signinAzure");
}

export async function signInM365() {
  await vscode.commands.executeCommand("fx-extension.signinM365");
}

export async function signOutAzure(isFromTreeView: boolean) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOutStart, {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTriggerFrom.TreeView
      : TelemetryTriggerFrom.CommandPalette,
    [TelemetryProperty.AccountType]: AccountType.Azure,
  });
  await vscode.window.showInformationMessage(
    localize("teamstoolkit.commands.azureAccount.signOutHelp")
  );
}

export async function signOutM365(isFromTreeView: boolean) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOutStart, {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTriggerFrom.TreeView
      : TelemetryTriggerFrom.CommandPalette,
    [TelemetryProperty.AccountType]: AccountType.M365,
  });
  let result = false;
  result = await M365TokenInstance.signout();
  if (result) {
    accountTreeViewProviderInstance.m365AccountNode.setSignedOut();
    await envTreeProviderInstance.reloadEnvironments();
  }
}
