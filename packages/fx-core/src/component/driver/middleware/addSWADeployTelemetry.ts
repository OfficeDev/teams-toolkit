// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import { WrapDriverContext } from "../util/wrapUtil";
import {
  TeamsFxTelemetryConfig,
  TeamsFxTelemetryReporter,
} from "../../utils/teamsFxTelemetryReporter";
import { TelemetryConstant } from "../../constant/commonConstant";
import { performance } from "perf_hooks";
import { TelemetryConstants } from "../../constants";
import { isExecutionResult } from "./addStartAndEndTelemetry";
import { maskSecretValues } from "../../utils/envUtil";

/**
 * A special telemetry middleware for SWA deployment.
 * @param eventName The event name to be sent.
 */
export function addSWADeployTelemetry(eventName: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const name = ctx.arguments[4] as string | undefined;
    const command = maskSecretValues(ctx.arguments[0].args as string);
    // only add telemetry for script
    if (!name?.includes("deploy to Azure Static Web Apps")) {
      await next();
      return;
    }
    const driverContext = ctx.arguments[1] as WrapDriverContext;
    let telemetryReporter: TeamsFxTelemetryReporter | undefined = undefined;
    if (driverContext.telemetryReporter) {
      telemetryReporter = new TeamsFxTelemetryReporter(driverContext.telemetryReporter, {
        componentName: TelemetryConstant.DEPLOY_TO_SWA_COMPONENT,
      });
    }
    telemetryReporter?.sendStartEvent({ eventName });
    const startTime = performance.now();
    await next();
    const timeCost = performance.now() - startTime;

    const result = isExecutionResult(ctx.result) ? ctx.result.result : ctx.result;

    const telemetryConfig: TeamsFxTelemetryConfig = {
      eventName: eventName,
      properties: { command: command, ...driverContext.telemetryProperties },
      measurements: { [TelemetryConstants.properties.timeCost]: timeCost },
    };

    if (result.isOk()) {
      telemetryReporter?.sendEndEvent(telemetryConfig);
    } else {
      telemetryReporter?.sendEndEvent(telemetryConfig, result.error);
    }
  };
}
