// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "fx-api";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryProperty } from "../telemetry/extTelemetryEvents";

export enum EnvCheckerEvent {
  skipCheckFunc = "skip-check-func",
  checkFunc = "check-func",

  funcV1Installed = "func-v1-installed",
  funcV2Installed = "func-v2-installed",
  funcV3Installed = "func-v3-installed",

  installingFunc = "installing-func",
  installedFunc = "installed-func",

  validateFunc = "validate-func"
}

export enum TelemtryMessages {
  failedToInstallFunc = "failed to install Func core tools.",
  funcV1Installed = "func v1 is installed by user.",
  packageManagerNotFound = "supported package manager (npm) is not found."
}

enum TelemetryMessurement {
  installFunc = "install-func"
}

export class EnvCheckerTelemetry {
  private static readonly _telemetryComponentType = "extension:debug:envchecker";

  public static sendEvent(eventName: EnvCheckerEvent, timecost?: number): void {
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
    eventName: EnvCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    const start = performance.now();
    await action();
    // use seconds instead of milliseconds
    const timecost = (performance.now() - start) / 1000;
    this.sendEvent(eventName, timecost);
  }

  public static sendUserErrorEvent(eventName: EnvCheckerEvent, errorMessage: string): void {
    const error = new UserError(eventName, errorMessage, this._telemetryComponentType);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, {
      [TelemetryProperty.Component]: this._telemetryComponentType
    });
  }

  public static sendSystemErrorEvent(
    eventName: EnvCheckerEvent,
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
