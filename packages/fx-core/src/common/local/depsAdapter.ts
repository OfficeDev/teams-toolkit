// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { DepsCheckerEvent } from "../deps-checker/constant/telemetry";
import { DepsLogger } from "../deps-checker/depsLogger";
import { DepsTelemetry } from "../deps-checker/depsTelemetry";

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

// TODO: Implement DepsLoggerAdapter
export class DepsLoggerAdapter implements DepsLogger {
  private logger: LogProvider | undefined;

  public constructor(logger: LogProvider | undefined) {
    this.logger = logger;
  }
  public async debug(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async info(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async warning(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async error(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async append(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async appendLine(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async printDetailLog(): Promise<void> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
  }

  cleanup(): void {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
  }
}
