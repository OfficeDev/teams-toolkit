// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";

export function debugInTestToolHandler(source: "treeview" | "message") {
  return async () => {
    if (source === "treeview") {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.TreeViewDebugInTestTool);
    } else {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MessageDebugInTestTool);
    }
    await vscode.commands.executeCommand("workbench.action.quickOpen", "debug Debug in Test Tool");
    return ok<unknown, FxError>(null);
  };
}
