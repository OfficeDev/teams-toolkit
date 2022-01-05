// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { DepsCheckerEvent } from "./constant/telemetry";

export interface DepsTelemetry {
  sendEvent(
    eventName: DepsCheckerEvent,
    properties?: { [p: string]: string },
    timecost?: number
  ): void;

  sendEventWithDuration(eventName: DepsCheckerEvent, action: () => Promise<void>): Promise<void>;

  sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void;

  sendSystemErrorEvent(eventName: DepsCheckerEvent, errorMessage: string, errorStack: string): void;
}

// TODO: Implement DepsTelemetryAdapter
export class DepsTelemetryAdapter implements DepsTelemetry {
  private telemetryReporter: TelemetryReporter | undefined;

  public constructor(telemetryReporter: TelemetryReporter | undefined) {
    this.telemetryReporter = telemetryReporter;
  }
  public sendEvent(
    eventName: DepsCheckerEvent,
    properties?: { [p: string]: string },
    timecost?: number
  ): void {
    if (this.telemetryReporter) {
      throw new Error("Method not implemented.");
    }
  }
  public async sendEventWithDuration(
    eventName: DepsCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    if (this.telemetryReporter) {
      throw new Error("Method not implemented.");
    }
  }

  public sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    if (this.telemetryReporter) {
      throw new Error("Method not implemented.");
    }
  }

  public sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string
  ): void {
    if (this.telemetryReporter) {
      throw new Error("Method not implemented.");
    }
  }
}
