import { IDepsTelemetry } from "../../../../src/debug/depsChecker/checker";
import { DepsCheckerEvent } from "../../../../src/debug/depsChecker/common";

export class TestTelemetry implements IDepsTelemetry {
  sendEvent(
    eventName: DepsCheckerEvent,
    properties: { [p: string]: string } = {},
    timecost?: number
  ): void {
    // empty method
  }

  sendEventWithDuration(eventName: DepsCheckerEvent, action: () => Promise<void>): Promise<void> {
    return Promise.resolve();
  }

  sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    // empty method
  }

  sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string
  ): void {
    // empty method
  }
}
