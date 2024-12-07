// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { launchBrowser } from "../../pluginDebug/browser-launcher"
import * as CDP from "chrome-remote-interface";
import { connectWithBackoff, subscribeToWebSocketEvents } from "../../pluginDebug/cdp-client";
import { startConnectionCheck } from "../../pluginDebug/connection-checks";

export class ConnectToExistingBrowserDebugSessionForCopilot extends BaseTaskTerminal {

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
  }

  async connect(): Promise<void> {
    let debugPort: number = 9222;

    let client: CDP.Client;
    client = await connectWithBackoff(debugPort);

    startConnectionCheck(client);
    await subscribeToWebSocketEvents(client);
    void vscode.window.showInformationMessage(
      `Connected to DevTools Protocol in existing debug session on port: ${debugPort}`
    );
  }

  async do(): Promise<Result<Void, FxError>> {
    await this.connect();
    return ok(Void);
  }
}