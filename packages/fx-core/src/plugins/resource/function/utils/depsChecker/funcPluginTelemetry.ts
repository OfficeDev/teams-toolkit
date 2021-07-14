/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import { performance } from "perf_hooks";
import { PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";
import { IDepsTelemetry } from "./checker";
import { DepsCheckerEvent, TelemetryMessurement } from "./common";
import { TelemetryHelper } from "../telemetry-helper";
import { TelemetryKey } from "../../enums";

export class FuncPluginTelemetry implements IDepsTelemetry {
  private readonly _source = "func-envchecker";

  private static getCommonProps(): { [key: string]: string } {
    const properties: { [key: string]: string } = {};
    properties[TelemetryKey.OSArch] = os.arch();
    properties[TelemetryKey.OSRelease] = os.release();
    return properties;
  }

  public sendEvent(
    eventName: DepsCheckerEvent,
    properties: { [key: string]: string } = {},
    timecost?: number
  ): void {
    const measurements: { [p: string]: number } = {};
    if (timecost) {
      measurements[TelemetryMessurement.completionTime] = timecost;
    }
    TelemetryHelper.sendSuccessEvent(
      eventName,
      { ...properties, ...FuncPluginTelemetry.getCommonProps() },
      measurements
    );
  }

  public async sendEventWithDuration(
    eventName: DepsCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    const start = performance.now();
    await action();

    // use seconds instead of milliseconds
    const timecost = Number(((performance.now() - start) / 1000).toFixed(2));
    const measurements: { [p: string]: number } = {};
    if (timecost) {
      measurements[TelemetryMessurement.completionTime] = timecost;
    }

    TelemetryHelper.sendSuccessEvent(eventName, FuncPluginTelemetry.getCommonProps(), measurements);
  }

  public sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    const error = new UserError(eventName, errorMessage, this._source);
    TelemetryHelper.sendErrorEvent(eventName, error, FuncPluginTelemetry.getCommonProps());
  }

  public sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string
  ): void {
    const error = new SystemError(
      eventName,
      `errorMsg=${errorMessage},errorStack=${errorStack}`,
      this._source,
      errorStack
    );
    TelemetryHelper.sendErrorEvent(eventName, error, FuncPluginTelemetry.getCommonProps());
  }
}
