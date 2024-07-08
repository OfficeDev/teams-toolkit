// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, ok } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import path from "path";
import * as vscode from "vscode";
import { PanelType } from "../controls/PanelType";
import { WebviewPanel } from "../controls/webviewPanel";
import { isTeamsFxProject, workspaceUri } from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
  TelemetryUpdateAppReason,
} from "../telemetry/extTelemetryEvents";
import { openFolderInExplorer } from "../utils/commonUtils";
import { getWalkThroughId } from "../utils/projectStatusUtils";
import { getTriggerFromProperty } from "../utils/telemetryUtils";

export async function openLifecycleTreeview(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ClickOpenLifecycleTreeview,
    getTriggerFromProperty(args)
  );
  if (isTeamsFxProject) {
    await vscode.commands.executeCommand("teamsfx-lifecycle.focus");
  } else {
    await vscode.commands.executeCommand("workbench.view.extension.teamsfx");
  }
}

export async function openWelcomeHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.GetStarted, getTriggerFromProperty(args));
  const data = await vscode.commands.executeCommand(
    "workbench.action.openWalkthrough",
    getWalkThroughId()
  );
  return Promise.resolve(ok(data));
}

export async function openSamplesHandler(...args: unknown[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Samples, getTriggerFromProperty(args));
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return Promise.resolve(ok(null));
}

export function openFolderHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  const scheme = "file://";
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenFolder, {
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Notification,
  });
  if (args && args.length > 0 && args[0]) {
    let path = args[0] as string;
    if (path.startsWith(scheme)) {
      path = path.substring(scheme.length);
    }
    const uri = vscode.Uri.file(path);
    openFolderInExplorer(uri.fsPath);
  }
  return Promise.resolve(ok(null));
}

export function saveTextDocumentHandler(document: vscode.TextDocumentWillSaveEvent) {
  if (!isValidProject(workspaceUri?.fsPath)) {
    return;
  }

  let reason: TelemetryUpdateAppReason | undefined = undefined;
  switch (document.reason) {
    case vscode.TextDocumentSaveReason.Manual:
      reason = TelemetryUpdateAppReason.Manual;
      break;
    case vscode.TextDocumentSaveReason.AfterDelay:
      reason = TelemetryUpdateAppReason.AfterDelay;
      break;
    case vscode.TextDocumentSaveReason.FocusOut:
      reason = TelemetryUpdateAppReason.FocusOut;
      break;
  }

  let curDirectory = path.dirname(document.document.fileName);
  while (curDirectory) {
    if (isValidProject(curDirectory)) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateTeamsApp, {
        [TelemetryProperty.UpdateTeamsAppReason]: reason,
      });
      return;
    }

    if (curDirectory === path.join(curDirectory, "..")) {
      break;
    }
    curDirectory = path.join(curDirectory, "..");
  }
}
