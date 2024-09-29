// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { performance } from "perf_hooks";
import { TelemetryProperty } from "../../../common/telemetry";
import {
  TeamsFxTelemetryConfig,
  TeamsFxTelemetryReporter,
} from "../../utils/teamsFxTelemetryReporter";
import { ExecutionResult } from "../interface/stepDriver";
import { WrapDriverContext } from "../util/wrapUtil";

// Based on fx-core's design that a component should always return FxError instead of throw exception, no error handling is added
// Will remove `/` in the componentName to avoid the value being redacted.
export function addStartAndEndTelemetry(eventName: string, componentName: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const driverContext = ctx.arguments[1] as WrapDriverContext;
    let telemetryReporter: TeamsFxTelemetryReporter | undefined = undefined;
    if (driverContext.telemetryReporter) {
      const normalizedComponentName = componentName.replace(/\//g, ""); // Remove `/` in the componentName to avoid the value being redacted.
      telemetryReporter = new TeamsFxTelemetryReporter(driverContext.telemetryReporter, {
        componentName: normalizedComponentName,
      });
    }
    telemetryReporter?.sendStartEvent({ eventName });
    const startTime = performance.now();
    await next();
    const timeCost = performance.now() - startTime;

    let result: Result<Map<string, string>, FxError>;

    // support run and execution interface at the same time, can remove after we retire the run interface
    if (isExecutionResult(ctx.result)) {
      result = ctx.result.result;
    } else {
      result = ctx.result;
    }

    const telemetryConfig: TeamsFxTelemetryConfig = {
      eventName: eventName,
      properties: driverContext.telemetryProperties,
      measurements: { [TelemetryProperty.TimeCost]: timeCost },
    };

    if (result.isOk()) {
      telemetryReporter?.sendEndEvent(telemetryConfig);
    } else {
      telemetryReporter?.sendEndEvent(telemetryConfig, result.error);
    }
  };
}

export function isExecutionResult(
  result: Result<Map<string, string>, FxError> | ExecutionResult
): result is ExecutionResult {
  return (result as ExecutionResult).result !== undefined;
}
