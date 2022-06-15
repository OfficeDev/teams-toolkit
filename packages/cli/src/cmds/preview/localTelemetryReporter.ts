// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LocalTelemetryReporter } from "@microsoft/teamsfx-core";
import cliTelemetry from "../../telemetry/cliTelemetry";

export const localTelemetryReporter = new LocalTelemetryReporter({
  sendTelemetryEvent: cliTelemetry.sendTelemetryEvent,
  sendTelemetryErrorEvent: cliTelemetry.sendTelemetryErrorEvent,
});
