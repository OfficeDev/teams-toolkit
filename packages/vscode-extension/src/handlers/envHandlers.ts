// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, Stage, Void } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import { runCommand } from "./sharedOpts";
import envTreeProviderInstance from "../treeview/environmentTreeViewProvider";

export async function createNewEnvironment(args?: any[]): Promise<Result<undefined, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CreateNewEnvironmentStart,
    getTriggerFromProperty(args)
  );
  const result = await runCommand(Stage.createEnv);
  if (!result.isErr()) {
    await envTreeProviderInstance.reloadEnvironments();
  }
  return result;
}

export async function refreshEnvironment(args?: any[]): Promise<Result<Void, FxError>> {
  return await envTreeProviderInstance.reloadEnvironments();
}
