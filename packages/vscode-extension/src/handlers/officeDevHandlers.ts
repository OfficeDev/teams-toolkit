// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author xurui yao <xuruiyao@microsoft.com>
 */
"use strict";

import { FxError, Result, ok } from "@microsoft/teamsfx-api";
import {
  globalStateGet,
  globalStateUpdate,
  isManifestOnlyOfficeAddinProject,
} from "@microsoft/teamsfx-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { GlobalKey } from "../constants";
import { OfficeDevTerminal, TriggerCmdType } from "../debug/taskTerminal/officeDevTerminal";
import { VS_CODE_UI } from "../qm/vsc_ui";
import * as globalVariables from "../globalVariables";
import {
  TelemetryTriggerFrom,
  TelemetryEvent,
  TelemetryProperty,
} from "../telemetry/extTelemetryEvents";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import { localize } from "../utils/localizeUtils";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  ShowScaffoldingWarningSummary,
  autoInstallDependencyHandler,
  showLocalDebugMessage,
} from "../utils/autoOpenHelper";
import { openReadMeHandler, openSampleReadmeHandler } from "./readmeHandlers";

export async function openOfficePartnerCenterHandler(
  args?: any[]
): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_partner_center",
  });
  const url = "https://aka.ms/WXPAddinPublish";
  return VS_CODE_UI.openUrl(url);
}

export async function openGetStartedLinkHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_get_started",
  });
  const url = "https://learn.microsoft.com/office/dev/add-ins/overview/office-add-ins";
  return VS_CODE_UI.openUrl(url);
}

export async function openOfficeDevDeployHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_deploy",
  });
  const url = "https://aka.ms/WXPAddinDeploy";
  return VS_CODE_UI.openUrl(url);
}

export async function publishToAppSourceHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_publish",
  });
  const url =
    "https://learn.microsoft.com/partner-center/marketplace/submit-to-appsource-via-partner-center";
  return VS_CODE_UI.openUrl(url);
}

export async function openDebugLinkHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_debug",
  });
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/testing/debug-add-ins-overview"
  );
}

export async function openDocumentHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_document",
  });
  return VS_CODE_UI.openUrl("https://learn.microsoft.com/office/dev/add-ins/");
}

export async function openDevelopmentLinkHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_development",
  });
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/develop/develop-overview"
  );
}

export async function openLifecycleLinkHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_lifecycle",
  });
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/overview/core-concepts-office-add-ins"
  );
}

export async function openHelpFeedbackLinkHandler(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_feedback",
  });
  return VS_CODE_UI.openUrl("https://learn.microsoft.com/answers/tags/9/m365");
}

export async function openReportIssues(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_report",
  });
  return VS_CODE_UI.openUrl("https://github.com/OfficeDev/office-js/issues");
}

export async function openScriptLabLink(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_scriptLab",
  });
  return VS_CODE_UI.openUrl(
    "https://learn.microsoft.com/office/dev/add-ins/overview/explore-with-script-lab"
  );
}

export async function openPromptLibraryLink(args?: any[]): Promise<Result<boolean, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.DocumentationName]: "office_promptLibrary",
  });
  return VS_CODE_UI.openUrl("https://aka.ms/OfficeAddinsPromptLibrary");
}

export function validateOfficeAddInManifest(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.validateAddInManifest,
    getTriggerFromProperty(args)
  );
  const terminal = OfficeDevTerminal.getInstance(TriggerCmdType.triggerValidate);
  terminal.show();
  terminal.sendText(TriggerCmdType.triggerValidate);
  return Promise.resolve(ok(null));
}

export function installOfficeAddInDependencies(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.installAddInDependencies,
    getTriggerFromProperty(args)
  );
  const terminal = OfficeDevTerminal.getInstance(TriggerCmdType.triggerInstall);
  terminal.show();
  terminal.sendText(TriggerCmdType.triggerInstall);
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
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.stopAddInDebug, getTriggerFromProperty(args));
  const terminal = OfficeDevTerminal.getInstance(TriggerCmdType.triggerStopDebug);
  terminal.show();
  terminal.sendText(TriggerCmdType.triggerStopDebug);
  return Promise.resolve(ok(null));
}

export function generateManifestGUID(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.generateAddInGUID, getTriggerFromProperty(args));
  const terminal = OfficeDevTerminal.getInstance(TriggerCmdType.triggerGenerateGUID);
  terminal.show();
  terminal.sendText(TriggerCmdType.triggerGenerateGUID);
  return Promise.resolve(ok(null));
}

export async function autoOpenOfficeDevProjectHandler(): Promise<void> {
  const isOpenWalkThrough = (await globalStateGet(GlobalKey.OpenWalkThrough, false)) as boolean;
  const isOpenReadMe = (await globalStateGet(GlobalKey.OpenReadMe, "")) as string;
  const isOpenSampleReadMe = (await globalStateGet(GlobalKey.OpenSampleReadMe, false)) as boolean;
  const createWarnings = (await globalStateGet(GlobalKey.CreateWarnings, "")) as string;
  const autoInstallDependency = (await globalStateGet(GlobalKey.AutoInstallDependency)) as boolean;
  if (isOpenWalkThrough) {
    // current the welcome walkthrough is not supported for wxp add in
    await globalStateUpdate(GlobalKey.OpenWalkThrough, false);
  }
  if (isOpenReadMe === globalVariables.workspaceUri?.fsPath) {
    await openReadMeHandler([TelemetryTriggerFrom.Auto]);
    await globalStateUpdate(GlobalKey.OpenReadMe, "");

    await ShowScaffoldingWarningSummary(globalVariables.workspaceUri.fsPath, createWarnings);
    await globalStateUpdate(GlobalKey.CreateWarnings, "");
  }
  if (isOpenSampleReadMe) {
    await showLocalDebugMessage();
    await openSampleReadmeHandler([TelemetryTriggerFrom.Auto]);
    await globalStateUpdate(GlobalKey.OpenSampleReadMe, false);
  }
  if (autoInstallDependency) {
    if (!isManifestOnlyOfficeAddinProject(globalVariables.workspaceUri?.fsPath ?? ""))
      void popupOfficeAddInDependenciesMessage();
    await globalStateUpdate(GlobalKey.AutoInstallDependency, false);
  }
  if (
    globalVariables.isOfficeAddInProject &&
    !checkOfficeAddInInstalled(globalVariables.workspaceUri?.fsPath ?? "") &&
    !isManifestOnlyOfficeAddinProject(globalVariables.workspaceUri?.fsPath ?? "")
  ) {
    void popupOfficeAddInDependenciesMessage();
  }
}

export function checkOfficeAddInInstalled(directory: string): boolean {
  const nodeModulesExists = fs.existsSync(path.join(directory, "node_modules"));
  return nodeModulesExists;
}
