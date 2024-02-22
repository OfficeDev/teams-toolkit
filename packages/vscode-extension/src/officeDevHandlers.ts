// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author xurui yao <xuruiyao@microsoft.com>
 */
"use strict";

import * as vscode from "vscode";
import {
  OfficeDevTerminal,
  triggerGenerateGUID,
  triggerInstall,
  triggerStopDebug,
  triggerValidate,
} from "./debug/taskTerminal/officeDevTerminal";
import { FileNotFoundError, fetchManifestList } from "@microsoft/teamsfx-core";
import { VS_CODE_UI } from "./extension";
import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import * as globalVariables from "./globalVariables";
import * as path from "path";
import { localize } from "./utils/localizeUtils";
import { autoInstallDependencyHandler } from "./handlers";

export async function openOfficePartnerCenterHandler(
  args?: any[]
): Promise<Result<boolean, FxError>> {
  const url = "https://aka.ms/WXPAddinPublish";
  return VS_CODE_UI.openUrl(url);
}

export async function openGetStartedLinkHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  const url = "https://learn.microsoft.com/office/dev/add-ins/overview/office-add-ins";
  return VS_CODE_UI.openUrl(url);
}

export async function openOfficeDevDeployHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  const url = "https://aka.ms/WXPAddinDeploy";
  return VS_CODE_UI.openUrl(url);
}

export async function publishToAppSourceHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  const url =
    "https://learn.microsoft.com/partner-center/marketplace/submit-to-appsource-via-partner-center";
  return VS_CODE_UI.openUrl(url);
}

export async function openDebugLinkHandler(): Promise<Result<boolean, FxError>> {
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/testing/debug-add-ins-overview"
  );
}

export async function openDocumentHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  return VS_CODE_UI.openUrl("https://learn.microsoft.com/office/dev/add-ins/");
}

export async function openDevelopmentLinkHandler(args: any[]): Promise<Result<boolean, FxError>> {
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/develop/develop-overview"
  );
}

export async function openLifecycleLinkHandler(args: any[]): Promise<Result<boolean, FxError>> {
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/overview/core-concepts-office-add-ins"
  );
}

export async function openHelpFeedbackLinkHandler(args: any[]): Promise<Result<boolean, FxError>> {
  return VS_CODE_UI.openUrl("https://learn.microsoft.com/answers/tags/9/m365");
}

export async function openReportIssues(args?: any[]): Promise<Result<boolean, FxError>> {
  return VS_CODE_UI.openUrl("https://github.com/OfficeDev/office-js/issues");
}

export function validateOfficeAddInManifest(args?: any[]): Promise<Result<null, FxError>> {
  const terminal = OfficeDevTerminal.getInstance();
  terminal.show();
  terminal.sendText(triggerValidate);
  return Promise.resolve(ok(null));
}

export function installOfficeAddInDependencies(args?: any[]): Promise<Result<null, FxError>> {
  const terminal = OfficeDevTerminal.getInstance();
  terminal.show();
  terminal.sendText(triggerInstall);
  return Promise.resolve(ok(null));
}

export async function popupOfficeAddInDependenciesMessage() {
  const buttonOptions = ["Yes", "No"];
  const notificationMessage = localize("teamstoolkit.handlers.askInstallOfficeAddinDependency");

  const result = await vscode.window.showInformationMessage(notificationMessage, ...buttonOptions);

  if (result === "Yes") {
    // Handle Yes button click
    await autoInstallDependencyHandler();
  } else if (result === "No") {
    // Handle No button click
    void vscode.window.showInformationMessage(
      localize("teamstoolkit.handlers.installOfficeAddinDependencyCancelled")
    );
  } else {
    // Handle case where pop-up was dismissed without clicking a button
    // No action.
  }
}

export function stopOfficeAddInDebug(args?: any[]): Promise<Result<null, FxError>> {
  const terminal = OfficeDevTerminal.getInstance();
  terminal.show();
  terminal.sendText(triggerStopDebug);
  return Promise.resolve(ok(null));
}

export function generateManifestGUID(args?: any[]): Promise<Result<null, FxError>> {
  const terminal = OfficeDevTerminal.getInstance();
  terminal.show();
  terminal.sendText(triggerGenerateGUID);
  return Promise.resolve(ok(null));
}

export function editOfficeAddInManifest(args?: any[]): Promise<Result<null, FxError>> {
  const workspacePath = globalVariables.workspaceUri?.fsPath;
  if (!workspacePath) {
    void VS_CODE_UI.showMessage("error", `Not valid workspace path`, false);
    return Promise.resolve(err(new FileNotFoundError("editManifest", "workspace")));
  }

  const manifestList = fetchManifestList(workspacePath);
  if (!manifestList || manifestList.length == 0) {
    void VS_CODE_UI.showMessage("error", `Manifest not exist under ${workspacePath}`, false);
    return Promise.resolve(err(new FileNotFoundError("editManifest", "workspace")));
  }

  // open the first manifest xml under the workspace folder
  const manifestPath = path.join(workspacePath, manifestList[0]);
  const manifestFileUri = vscode.Uri.file(manifestPath);

  void vscode.window.showTextDocument(manifestFileUri, { viewColumn: vscode.ViewColumn.One });
  return Promise.resolve(ok(null));
}
