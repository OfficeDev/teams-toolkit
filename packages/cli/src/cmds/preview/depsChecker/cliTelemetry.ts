// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import { performance } from "perf_hooks";
import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { DepsCheckerEvent, TelemetryMessurement } from "./common";
import { IDepsTelemetry } from "./checker";

export class CLITelemetry implements IDepsTelemetry {
  private readonly _telemetryComponentType = "extension:debug:envchecker";

  public sendEvent(
    eventName: DepsCheckerEvent,
    properties: { [key: string]: string } = {},
    timecost?: number
  ): void {
    this.addCommonProps(properties);

    // TODO: send event
  }

  public async sendEventWithDuration(
    eventName: DepsCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    const start = performance.now();
    await action();
    // use seconds instead of milliseconds
    const timecost = Number(((performance.now() - start) / 1000).toFixed(2));
    this.sendEvent(eventName, {}, timecost);
  }

  public sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    // TODO: send user error event
  }

  public sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string
  ): void {
    // TODO: send system error event
  }

  private addCommonProps(properties: { [key: string]: string } = {}): { [key: string]: string } {
    // TODO: also send os info
    return properties;
  }
}

export const cliTelemetry = new CLITelemetry();
