// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { TeamsFxTelemetryReporter } from "../../utils/teamsFxTelemetryReporter";
import { DriverContext } from "../interface/commonArgs";

// Based on fx-core's design that a component should always return FxError instead of throw exception, no error handling is added
export function addStartAndEndTelemetry(eventName: string, componentName: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const driverContext = ctx.arguments[1] as DriverContext;
    let telemetryReporter: TeamsFxTelemetryReporter | undefined = undefined;
    if (driverContext.telemetryReporter) {
      telemetryReporter = new TeamsFxTelemetryReporter(driverContext.telemetryReporter, {
        componentName,
      });
    }
    telemetryReporter?.sendStartEvent({ eventName });
    await next();
    const result = ctx.result as Result<Map<string, string>, FxError>;
    if (result.isOk()) {
      telemetryReporter?.sendEndEvent({ eventName });
    } else {
      telemetryReporter?.sendEndEvent({ eventName }, result.error);
    }
  };
}
