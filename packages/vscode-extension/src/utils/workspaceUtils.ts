// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Warning } from "@microsoft/teamsfx-api";
import { globalStateUpdate } from "@microsoft/teamsfx-core";
import { GlobalKey } from "../constants";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  VSCodeWindowChoice,
} from "../telemetry/extTelemetryEvents";
import { isTriggerFromWalkThrough } from "./telemetryUtils";

export async function openOfficeDevFolder(
  folderPath: vscode.Uri,
  showLocalDebugMessage: boolean,
  warnings?: Warning[] | undefined,
  args?: any[]
) {
  // current the welcome walkthrough is not supported for wxp add in
  await globalStateUpdate(GlobalKey.OpenWalkThrough, false);
  await globalStateUpdate(GlobalKey.AutoInstallDependency, true);
  if (isTriggerFromWalkThrough(args)) {
    await globalStateUpdate(GlobalKey.OpenReadMe, "");
  } else {
    await globalStateUpdate(GlobalKey.OpenReadMe, folderPath.fsPath);
  }
  if (showLocalDebugMessage) {
    await globalStateUpdate(GlobalKey.ShowLocalDebugMessage, true);
  }
  if (warnings?.length) {
    await globalStateUpdate(GlobalKey.CreateWarnings, JSON.stringify(warnings));
  }
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.openNewOfficeAddInProject, {
    [TelemetryProperty.VscWindow]: VSCodeWindowChoice.NewWindowByDefault,
  });
  await vscode.commands.executeCommand("vscode.openFolder", folderPath, true);
}
