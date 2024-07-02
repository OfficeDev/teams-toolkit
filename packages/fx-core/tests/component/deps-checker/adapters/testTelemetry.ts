import { DepsCheckerEvent } from "../../../../src/component/deps-checker/constant/telemetry";
import { DepsTelemetry } from "../../../../src/component/deps-checker/depsTelemetry";

export class TestTelemetry implements DepsTelemetry {
  sendEvent(
    eventName: DepsCheckerEvent,
    properties: { [p: string]: string } = {},
    timecost?: number
  ): void {
    // empty method
  }

  async sendEventWithDuration(
    eventName: DepsCheckerEvent,
    action: () => Promise<void>
  ): Promise<void> {
    await action();
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
