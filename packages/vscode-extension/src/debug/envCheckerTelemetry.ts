// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "teamsfx-api";
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

const TelemetryComponentType = "extension:debug:envchecker";

export namespace EnvCheckerTelemetry {
  export function sendEvent(eventName: EnvCheckerEvent, timecost?: number): void {
    const properties: { [p: string]: string } = {
      [TelemetryProperty.Component]: TelemetryComponentType
    };

    const measurements: { [p: string]: number } = {};
    if (timecost) {
      measurements[TelemetryMessurement.installFunc] = timecost;
    }

    ExtTelemetry.sendTelemetryEvent(eventName, properties, measurements);
  }

  export function sendUserErrorEvent(eventName: EnvCheckerEvent, errorMessage: string): void {
    const error = new UserError(eventName, errorMessage, TelemetryComponentType);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, {
      [TelemetryProperty.Component]: TelemetryComponentType
    });
  }

  export function sendSystemErrorEvent(
    eventName: EnvCheckerEvent,
    errorMessage: string,
    errorStack: string
  ): void {
    const error = new SystemError(eventName, errorMessage, TelemetryComponentType, errorStack);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, {
      [TelemetryProperty.Component]: TelemetryComponentType
    });
  }
}
