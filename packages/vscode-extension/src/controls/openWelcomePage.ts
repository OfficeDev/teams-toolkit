// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ext } from "../extensionVariables";

const welcomePageKey = "ms-teams-vscode-extension.welcomePage.shown";

export async function openWelcomePageAfterExtensionInstallation(): Promise<void> {
  if (ext.context.globalState.get(welcomePageKey, false)) {
    // Don't show: already showed
    return;
  }

  // Let's show!
  await ext.context.globalState.update(welcomePageKey, true);
  vscode.commands.executeCommand("fx-extension.openWelcome");
}
