// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError } from "@microsoft/teamsfx-api";
import { LocalTelemetryReporter } from "@microsoft/teamsfx-core";
import cliTelemetry from "../../telemetry/cliTelemetry";

// Cannot directly refer to a global function which will cause unit test mock to fail
export const localTelemetryReporter = new LocalTelemetryReporter({
  sendTelemetryEvent: (
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ) => cliTelemetry.sendTelemetryEvent(eventName, properties, measurements),

  sendTelemetryErrorEvent: (
    eventName: string,
    error: FxError,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ) => cliTelemetry.sendTelemetryErrorEvent(eventName, error, properties, measurements, errorProps),
});
