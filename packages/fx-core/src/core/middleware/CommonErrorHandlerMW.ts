// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import { assembleError, err, FxError, Result } from "@microsoft/teamsfx-api";
import { kebabCase } from "lodash";
import {
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../common/telemetry";

export interface ErrorHandleOption {
  error?: FxError;
  startFn?: (ctx: HookContext) => Promise<Result<any, FxError>>;
  endFn?: (ctx: HookContext) => Promise<Result<any, FxError>>;
  telemetry?: {
    component: string;
    eventName?: string;
    properties?: Record<string, string>;
  };
}

export function CommonErrorHandlerMW(option?: ErrorHandleOption): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    try {
      if (option?.startFn) {
        await option?.startFn(ctx);
      }
      if (option?.telemetry) {
        const event = option.telemetry.eventName
          ? option.telemetry.eventName + "-start"
          : kebabCase(ctx.method!) + "-start";
        if (!option.telemetry.properties) {
          option.telemetry.properties = {};
          ctx.arguments.push(option.telemetry.properties);
        }
        sendTelemetryEvent(option.telemetry.component, event, option.telemetry.properties);
      }
      await next();
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      if (option?.telemetry) {
        const event = option.telemetry.eventName
          ? option.telemetry.eventName
          : kebabCase(ctx.method!);
        option.telemetry.properties![TelemetryProperty.Success] = TelemetrySuccess.Yes;
        sendTelemetryEvent(option.telemetry.component, event, option.telemetry.properties);
      }
    } catch (e) {
      const error = option?.error ? option.error : assembleError(e);
      ctx.error = error;
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      ctx.result = err(error);
      if (option?.telemetry) {
        const event = option.telemetry.eventName
          ? option.telemetry.eventName
          : kebabCase(ctx.method!);
        option.telemetry.properties![TelemetryProperty.Success] = TelemetrySuccess.No;
        sendTelemetryErrorEvent(
          option.telemetry.component,
          event,
          error,
          option.telemetry.properties
        );
      }
    }
  };
}
