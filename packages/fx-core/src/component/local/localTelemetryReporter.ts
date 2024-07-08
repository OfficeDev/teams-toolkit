// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import { performance } from "perf_hooks";
import { TelemetrySuccess, TelemetryProperty } from "../../common/telemetry";
import { assembleError } from "../../error/common";

export interface TelemetryContext {
  properties: Record<string, string>;
  // duration is in seconds
  measurements: Record<string | "duration", number>;
  errorProps: string[];
}

export interface ToolTelemetryReporter {
  sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void;

  sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void;
}

// Telemetry utility for local debug/preview in vsc/cli
export class LocalTelemetryReporter {
  public static readonly NoLastEventName = "no-last-event";
  public static readonly PropertyDebugLastEventName = "debug-last-event-name";
  public static readonly PropertyDuration = "duration";

  private static readonly ComponentName = "local-debug";
  private static readonly StartEventSuffix = "-start";
  private readonly reporter: ToolTelemetryReporter;
  private lastEventName: string | undefined;
  private saveEventTime?: (eventName: string, time: number) => void;

  constructor(
    reporter: ToolTelemetryReporter,
    saveEventTime?: (eventName: string, time: number) => void
  ) {
    this.reporter = reporter;
    this.saveEventTime = saveEventTime;
  }

  /**
   * Same as `runWithTelemetryProperties` but without `initialProperties`.
   */
  public async runWithTelemetry<T>(
    eventName: string,
    action: (ctx: TelemetryContext) => Promise<Result<T, FxError>>
  ): Promise<Result<T, FxError>> {
    return await this.runWithTelemetryProperties(eventName, {}, action);
  }

  /**
   * Same as `runWithTelemetry` but use exception. Not recommended.
   */
  public async runWithTelemetryException<T>(
    eventName: string,
    action: (ctx: TelemetryContext) => Promise<T>
  ): Promise<T> {
    return await this.runWithTelemetryGeneric(eventName, action, () => undefined);
  }

  public async runWithTelemetryExceptionProperties<T>(
    eventName: string,
    initialProperties: { [key: string]: string },
    action: (ctx: TelemetryContext) => Promise<T>
  ): Promise<T> {
    return await this.runWithTelemetryGeneric(
      eventName,
      action,
      () => undefined,
      initialProperties
    );
  }

  /**
   * Ensure "{eventName}-start" and "{eventName}" telemetry events with the following properties/measurements to be sent on start/end/exception.
   *
   * @param action: The actual action. User can set additional properties in execution into ctx.properties and ctx.measurements.
   * The `ctx` parameter has higher priority over `initialProperties` and auto-generated properties.
   * @param initialProperties: If specified, "{eventName}-start" and "{eventName}" will contain these properties.
   * User may return anything and errors are handled by exception.
   */
  public async runWithTelemetryProperties<T>(
    eventName: string,
    initialProperties: { [key: string]: string },
    action: (ctx: TelemetryContext) => Promise<Result<T, FxError>>
  ): Promise<Result<T, FxError>> {
    return await this.runWithTelemetryGeneric(
      eventName,
      action,
      (value: Result<T, FxError>): FxError | undefined => {
        return value.isErr() ? value.error : undefined;
      },
      initialProperties
    );
  }

  /**
   * Same as `runWithTelemtry()` but supports any return type.
   * User need to specify `getResultForTelemetry` to convert the result to `Result<T, FxError>`, so it can send correct telemetry.
   */
  public async runWithTelemetryGeneric<T>(
    eventName: string,
    action: (ctx: TelemetryContext) => Promise<T>,
    getResultForTelemetry: (result: T, ctx: TelemetryContext) => FxError | undefined,
    initialProperties?: { [key: string]: string }
  ): Promise<T> {
    const startMillis = performance.now();

    this.sendTelemetryEvent(eventName + LocalTelemetryReporter.StartEventSuffix, initialProperties);

    const ctx: TelemetryContext = {
      properties: initialProperties || {},
      measurements: {},
      errorProps: [],
    };
    // 3 cases in one result: Result<[actual result, FxError], exception>
    let result: Result<[T, FxError | undefined], unknown>;
    try {
      const value = await action(ctx);
      const resultForTelemetry = getResultForTelemetry(value, ctx);
      result = ok([value, resultForTelemetry]);
    } catch (error) {
      result = err(error);
    }
    const endMillis = performance.now();
    const durationSeconds = (endMillis - startMillis) / 1000;
    const properties = Object.assign({}, ctx.properties);
    const measurements = Object.assign(
      {
        [LocalTelemetryReporter.PropertyDuration]: durationSeconds,
      },
      ctx.measurements
    );
    const errorProps = [...ctx.errorProps];

    if (result.isErr()) {
      // exception
      const error = assembleError(result.error, LocalTelemetryReporter.ComponentName);
      properties[TelemetryProperty.Success] = TelemetrySuccess.No;
      this.sendTelemetryErrorEvent(eventName, error, properties, measurements, errorProps);
      // Propagate exception because wrapper function should not change original behavior.
      throw result.error;
    } else if (result.value[1] !== undefined) {
      // FxError
      properties[TelemetryProperty.Success] = TelemetrySuccess.No;
      this.sendTelemetryErrorEvent(
        eventName,
        result.value[1],
        properties,
        measurements,
        errorProps
      );
      return result.value[0];
    } else {
      // success
      properties[TelemetryProperty.Success] = TelemetrySuccess.Yes;
      this.sendTelemetryEvent(eventName, properties, measurements);
      return result.value[0];
    }
  }

  public getLastEventName(): string {
    return this.lastEventName === undefined
      ? LocalTelemetryReporter.NoLastEventName
      : this.lastEventName;
  }

  public sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    this.lastEventName = eventName;
    this.saveEventTime?.(eventName, performance.now());
    this.reporter.sendTelemetryEvent(eventName, properties, measurements);
  }

  public sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    if (properties?.[LocalTelemetryReporter.PropertyDebugLastEventName] === undefined) {
      if (properties === undefined) {
        properties = {};
      }
      properties[LocalTelemetryReporter.PropertyDebugLastEventName] = this.getLastEventName();
    }
    this.lastEventName = eventName;
    this.saveEventTime?.(eventName, performance.now());
    this.reporter.sendTelemetryErrorEvent(eventName, error, properties, measurements, errorProps);
  }
}
