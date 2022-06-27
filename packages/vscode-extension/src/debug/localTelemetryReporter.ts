// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError } from "@microsoft/teamsfx-api";
import { LocalTelemetryReporter } from "@microsoft/teamsfx-core";
import { performance } from "perf_hooks";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { getLocalDebugSession, getProjectComponents } from "./commonUtils";

export const localTelemetryReporter = new LocalTelemetryReporter({
  // Cannot directly refer to a global function because of import dependency cycle in ../telemetry/extTelemetry.ts.
  sendTelemetryEvent: (
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ) => ExtTelemetry.sendTelemetryEvent(eventName, properties, measurements),

  sendTelemetryErrorEvent: (
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ) => ExtTelemetry.sendTelemetryErrorEvent(eventName, error, properties, measurements, errorProps),
});

export async function sendDebugAllStartEvent(): Promise<void> {
  const session = getLocalDebugSession();
  const components = await getProjectComponents();
  session.properties[TelemetryProperty.DebugProjectComponents] = components + "";

  const properties = Object.assign(
    { [TelemetryProperty.CorrelationId]: session.id },
    session.properties
  );
  localTelemetryReporter.sendTelemetryEvent(TelemetryEvent.DebugAllStart, properties);
}

export async function sendDebugAllEvent(
  isRemote?: boolean,
  error?: FxError,
  additionalProperties?: { [key: string]: string }
): Promise<void> {
  const session = getLocalDebugSession();
  const now = performance.now();

  let duration = -1;
  if (session.startTime !== undefined) {
    duration = (now - session.startTime) / 1000;
  }

  const properties = {
    [TelemetryProperty.CorrelationId]: session.id,
    [TelemetryProperty.DebugRemote]: `${isRemote}`, // undefined, true or false
    [TelemetryProperty.Success]: error === undefined ? TelemetrySuccess.Yes : TelemetrySuccess.No,
    ...session.properties,
    ...additionalProperties,
  };

  if (error === undefined) {
    localTelemetryReporter.sendTelemetryEvent(TelemetryEvent.DebugAll, properties, {
      [LocalTelemetryReporter.PropertyDuration]: duration,
    });
  } else {
    localTelemetryReporter.sendTelemetryErrorEvent(TelemetryEvent.DebugAll, error, properties, {
      [LocalTelemetryReporter.PropertyDuration]: duration,
    });
  }
}
