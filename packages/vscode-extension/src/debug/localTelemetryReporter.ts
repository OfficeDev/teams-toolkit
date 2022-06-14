// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LocalTelemetryReporter } from "@microsoft/teamsfx-core";
import { ExtTelemetry } from "../telemetry/extTelemetry";

export const localTelemetryReporter = new LocalTelemetryReporter({
  sendTelemetryEvent: ExtTelemetry.sendTelemetryEvent,
  sendTelemetryErrorEvent: ExtTelemetry.sendTelemetryErrorEvent,
});
