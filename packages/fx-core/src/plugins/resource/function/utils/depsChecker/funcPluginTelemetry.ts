// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { performance } from "perf_hooks";
import { FxError, SystemError, UserError } from "fx-api";
import { IDepsTelemetry } from "./checker";
import { DepsCheckerEvent, TelemetryMessurement } from "./common";

namespace ExtTelemetry {
  export function sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    // implement me
  }

  export function sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    // implement me
  }

  export function sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    // implement me
  }
}

enum TelemetryProperty {
  Component = "component",
}

class FuncPluginTelemetry implements IDepsTelemetry {
  private readonly _telemetryComponentType = "extension:debug:envchecker";

  public sendEvent(eventName: DepsCheckerEvent, timecost?: number): void {
    const properties: { [p: string]: string } = {
      [TelemetryProperty.Component]: this._telemetryComponentType
    };

    const measurements: { [p: string]: number } = {};
    if (timecost) {
      measurements[TelemetryMessurement.completionTime] = timecost;
    }

    ExtTelemetry.sendTelemetryEvent(eventName, properties, measurements);
  }

  public async sendEventWithDuration(
    eventName: DepsCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    const start = performance.now();
    await action();
    // use seconds instead of milliseconds
    const timecost = Number(((performance.now() - start) / 1000).toFixed(2));
    this.sendEvent(eventName, timecost);
  }

  public sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    const error = new UserError(eventName, errorMessage, this._telemetryComponentType);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, {
      [TelemetryProperty.Component]: this._telemetryComponentType
    });
  }

  public sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string
  ): void {
    const error = new SystemError(
      eventName,
      errorMessage,
      this._telemetryComponentType,
      errorStack
    );
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, {
      [TelemetryProperty.Component]: this._telemetryComponentType
    });
  }
}

export const funcPluginTelemetry = new FuncPluginTelemetry();
