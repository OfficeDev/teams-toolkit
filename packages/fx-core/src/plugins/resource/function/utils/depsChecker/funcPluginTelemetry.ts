/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { performance } from "perf_hooks";
import { PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";
import { IDepsTelemetry } from "./checker";
import { DepsCheckerEvent, TelemetryMessurement } from "./common";
import { telemetryHelper } from "../telemetry-helper";

export class FuncPluginTelemetry implements IDepsTelemetry {
  private readonly _source = "func-envchecker";
  private readonly _ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this._ctx = ctx;
  }

  public sendEvent(eventName: DepsCheckerEvent, timecost?: number): void {
    const measurements: { [p: string]: number } = {};
    if (timecost) {
      measurements[TelemetryMessurement.completionTime] = timecost;
    }
    telemetryHelper.sendSuccessEvent(this._ctx, eventName, {}, measurements);
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

    telemetryHelper.sendSuccessEvent(this._ctx, eventName, {}, measurements);
  }

  public sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    const error = new UserError(eventName, errorMessage, this._source);
    telemetryHelper.sendErrorEvent(this._ctx, eventName, error);
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
    telemetryHelper.sendErrorEvent(this._ctx, eventName, error);
  }
}