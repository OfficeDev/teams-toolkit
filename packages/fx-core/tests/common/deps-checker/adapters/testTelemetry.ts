import {
  DepsTelemetry,
  DepsTelemetryContext,
} from "../../../../src/common/deps-checker/depsTelemetry";
import { DepsCheckerEvent } from "../../../../src/common/deps-checker/constant/telemetry";

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
    action: (ctx: DepsTelemetryContext) => Promise<void>
  ): Promise<void> {
    const ctx = { properties: {} };
    await action(ctx);
    return Promise.resolve();
  }

  sendUserErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    properties: { [key: string]: string } | undefined
  ): void {
    // empty method
  }

  sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string,
    properties: { [key: string]: string } | undefined
  ): void {
    // empty method
  }
}
