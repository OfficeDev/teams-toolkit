// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { assembleError, err, FxError, Inputs, Result } from "@microsoft/teamsfx-api";
import { kebabCase } from "lodash";
import { CoreHookContext, FxCore } from "..";
import { sendTelemetryEvent, TelemetryProperty, TelemetrySuccess } from "../../common/telemetry";

/**
 * Telemetry sender
 */
export const TelemetrySenderMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const core = ctx.self as FxCore;
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const solutionContext = ctx.solutionContext;
  const appId = solutionContext?.config?.get("solution")?.get("remoteTeamsAppId") as string;
  const properties: any = { module: "fx-core" };
  if (appId)
    properties[TelemetryProperty.AppId] = appId;
  const correlationId = inputs.correlationId === undefined ? "":inputs.correlationId;
  properties[TelemetryProperty.CorrelationId] = correlationId;
  const method = kebabCase(ctx.method!);
  try {
    sendTelemetryEvent(core.tools.telemetryReporter, inputs, method + "-start", properties);
    await next();
  } catch (e) {
    ctx.result = err(assembleError(e));
    throw e;
  } finally {
    if (ctx.result?.isOk()) {
      properties[TelemetryProperty.Success] = TelemetrySuccess.Yes;
      sendTelemetryEvent(core.tools.telemetryReporter, inputs, method, properties);
    }
    else {
      properties[TelemetryProperty.Success] = TelemetrySuccess.No;
      sendTelemetryEvent(core.tools.telemetryReporter, inputs, method, properties);
    }
  }
};
