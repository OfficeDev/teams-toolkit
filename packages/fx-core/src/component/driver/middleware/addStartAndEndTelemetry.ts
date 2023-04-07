// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { TeamsFxTelemetryReporter } from "../../utils/teamsFxTelemetryReporter";
import { WrapDriverContext } from "../util/wrapUtil";
import { ExecutionResult } from "../interface/stepDriver";

// Based on fx-core's design that a component should always return FxError instead of throw exception, no error handling is added
export function addStartAndEndTelemetry(eventName: string, componentName: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const driverContext = ctx.arguments[1] as WrapDriverContext;
    let telemetryReporter: TeamsFxTelemetryReporter | undefined = undefined;
    if (driverContext.telemetryReporter) {
      telemetryReporter = new TeamsFxTelemetryReporter(driverContext.telemetryReporter, {
        componentName,
      });
    }
    telemetryReporter?.sendStartEvent({ eventName });
    await next();

    let result: Result<Map<string, string>, FxError>;

    // support run and execution interface at the same time, can remove after we retire the run interface
    if (isExecutionResult(ctx.result)) {
      result = ctx.result.result;
    } else {
      result = ctx.result;
    }

    if (result.isOk()) {
      telemetryReporter?.sendEndEvent({
        eventName: eventName,
        properties: driverContext.telemetryProperties,
      });
    } else {
      telemetryReporter?.sendEndEvent(
        { eventName: eventName, properties: driverContext.telemetryProperties },
        result.error
      );
    }
  };
}

function isExecutionResult(
  result: Result<Map<string, string>, FxError> | ExecutionResult
): result is ExecutionResult {
  return (result as ExecutionResult).result !== undefined;
}
