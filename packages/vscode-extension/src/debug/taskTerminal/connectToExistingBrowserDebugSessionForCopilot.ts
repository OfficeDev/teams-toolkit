// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as CDP from "chrome-remote-interface";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import { connectWithBackoff, subscribeToWebSocketEvents } from "../../pluginDebugger/cdpClient";
import { startConnectionCheck } from "../../pluginDebugger/connectionChecks";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { getLocalDebugSession } from "../common/localDebugSession";
import {
  connectToExistingBrowserDebugSessionForCopilot,
  DefaultRemoteDebuggingPort,
} from "../common/debugConstants";
import { localTelemetryReporter } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export class ConnectToExistingBrowserDebugSessionForCopilot extends BaseTaskTerminal {
  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
  }

  do(): Promise<Result<Void, FxError>> {
    return Correlator.runWithId(getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryExceptionProperties(
        TelemetryEvent.ConnectToExistingBrowserDebugSessionForCopilot,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    const client: CDP.Client = await connectWithBackoff(DefaultRemoteDebuggingPort);
    startConnectionCheck(client);
    await subscribeToWebSocketEvents(client);
    vscode.debug.activeDebugConsole.appendLine(
      connectToExistingBrowserDebugSessionForCopilot.successfulConnectionMessage(
        DefaultRemoteDebuggingPort
      )
    );
    return ok(Void);
  }
}
