import { IDepsTelemetry } from "../../../../src/debug/depsChecker/checker";
import { DepsCheckerEvent } from "../../../../src/debug/depsChecker/common";

export class TestTelemetry implements IDepsTelemetry {
    sendEvent(eventName: DepsCheckerEvent, timecost?: number): void {
    }

    sendEventWithDuration(eventName: DepsCheckerEvent, action: () => Promise<void>): Promise<void> {
        return Promise.resolve();
    }

    sendUserErrorEvent(eventName: DepsCheckerEvent, errorMessage: string): void {
    }

    sendSystemErrorEvent(eventName: DepsCheckerEvent, errorMessage: string, errorStack: string): void {
    }
}