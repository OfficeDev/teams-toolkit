// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { performance } from "perf_hooks";
import { SystemError, UserError } from "fx-api";
import { ExtTelemetry, TelemetryProperty } from "./checkerAdapter";

export enum DepsCheckerEvent {
  skipCheckFunc = "skip-check-func",
  checkFunc = "check-func",

  funcV1Installed = "func-v1-installed",
  funcV2Installed = "func-v2-installed",
  funcV3Installed = "func-v3-installed",

  installingFunc = "installing-func",
  installedFunc = "installed-func",
  installedValidFunc = "installed-func-with-validation",

  validateFunc = "validate-func"
}

export enum TelemtryMessages {
  failedToInstallFunc = "failed to install Func core tools.",
  funcV1Installed = "func v1 is installed by user.",
  NPMNotFound = "npm is not found."
}

enum TelemetryMessurement {
  installFunc = "install-func"
}

export class DepsCheckerTelemetry {
  private static readonly _telemetryComponentType = "extension:debug:envchecker";

  public static sendEvent(eventName: DepsCheckerEvent, timecost?: number): void {
    const properties: { [p: string]: string } = {
      [TelemetryProperty.Component]: this._telemetryComponentType
    };

    const measurements: { [p: string]: number } = {};
    if (timecost) {
      measurements[TelemetryMessurement.installFunc] = timecost;
    }

    ExtTelemetry.sendTelemetryEvent(eventName, properties, measurements);
  }

  public static async sendEventWithDuration(
    eventName: DepsCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    const start = performance.now();
    await action();
    // use seconds instead of milliseconds
    const timecost = Number(((performance.now() - start) / 1000).toFixed(2));
    this.sendEvent(eventName, timecost);
  }

  public static sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    const error = new UserError(eventName, errorMessage, this._telemetryComponentType);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, {
      [TelemetryProperty.Component]: this._telemetryComponentType
    });
  }

  public static sendSystemErrorEvent(
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
