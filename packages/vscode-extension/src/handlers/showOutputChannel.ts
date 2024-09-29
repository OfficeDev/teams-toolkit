// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import VsCodeLogInstance from "../commonlib/log";
import { FxError, Result, ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";

export function showOutputChannelHandler(args?: any[]): Result<any, FxError> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowOutputChannel);
  VsCodeLogInstance.outputChannel.show();
  return ok(null);
}
