// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { globalStateGet, globalStateUpdate } from "@microsoft/teamsfx-core";
import { TelemetryTiggerFrom } from "../telemetry/extTelemetryEvents";

const welcomePageKey = "ms-teams-vscode-extension.welcomePage.shown";

export async function openWelcomePageAfterExtensionInstallation(): Promise<void> {
  if (globalStateGet(welcomePageKey, false)) {
    // Don't show: already showed
    return;
  }

  // Let's show!
  await globalStateUpdate(welcomePageKey, true);
  vscode.commands.executeCommand("fx-extension.openWelcome", TelemetryTiggerFrom.Other);
  vscode.commands.executeCommand("workbench.view.extension.teamsfx");
}
