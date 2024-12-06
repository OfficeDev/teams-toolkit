// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as CDP from "chrome-remote-interface";
import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import { launchBrowser } from "../../pluginDebugger/browserLauncher";
import { connectWithBackoff, subscribeToWebSocketEvents } from "../../pluginDebugger/cdpClient";
import { startConnectionCheck } from "../../pluginDebugger/connectionChecks";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { getLocalDebugSession } from "../common/localDebugSession";
import {
  launchingBrowserWindowForCopilot,
  DefaultRemoteDebuggingPort,
} from "../common/debugConstants";
import { localTelemetryReporter } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";

interface LaunchBrowserForCopilotArgs {
  url: string;
}

export class LaunchBrowserWindowForCopilot extends BaseTaskTerminal {
  private readonly args: LaunchBrowserForCopilotArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as LaunchBrowserForCopilotArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    return Correlator.runWithId(getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryExceptionProperties(
        TelemetryEvent.LaunchBrowserForCopilot,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    let client: CDP.Client;
    try {
      await launchBrowser("https://www.office.com/chat?auth=2&developerMode=basic");
      client = await connectWithBackoff(DefaultRemoteDebuggingPort);
    } catch (error) {
      throw new Error(launchingBrowserWindowForCopilot.unsuccessfulLaunchMessage(error));
    }

    startConnectionCheck(client);
    await subscribeToWebSocketEvents(client);
    vscode.debug.activeDebugConsole.appendLine("Browser launched successfully.");
    return ok(Void);
  }
}
