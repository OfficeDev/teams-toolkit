// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { Effect, FxError, Result, SystemError, TelemetryReporter } from "@microsoft/teamsfx-api";
import { TelemetryConstants } from "../constants";
import { ActionContext, ActionTelemetryReporter } from "./types";
export function TelemetryMW(
  telemetryCreater: new (reporter: TelemetryReporter) => ActionTelemetryReporter
): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    const telemetry = new telemetryCreater(actionContext.telemetryReporter);
    actionContext.telemetry = telemetry;
    actionContext.telemetry.sendStartEvent?.(actionContext);
    await next();
    const result = ctx.result as Result<Effect[], FxError>;
    if (result.isOk()) {
      actionContext.telemetry.sendEndEvent?.(actionContext);
    } else {
      actionContext.telemetry?.sendEndEventWithError?.(actionContext, result.error);
    }
  };
}

export class ActionTelemetryImplement implements ActionTelemetryReporter {
  reporter: TelemetryReporter;
  constructor(stage: string, componentName: string, reporter: TelemetryReporter) {
    this.reporter = reporter;
    this.stage = stage;
    this.componentName = componentName;
    this.properties[TelemetryConstants.properties.component] = this.componentName;
  }
  stage: string;
  componentName: string;
  properties = {} as { [key: string]: string };
  measurements = {} as { [key: string]: number };
  errorProps = [TelemetryConstants.properties.errorMessage];
  addProperty = (key: string, value: string) => {
    this.properties[key] = value;
  };

  sendStartEvent = (ctx: ActionContext) => {
    this.sendTelemetryEvent(this.stage + TelemetryConstants.eventPrefix);
  };
  sendEndEvent = (ctx: ActionContext) => {
    this.sendTelemetryEvent(this.stage, {
      [TelemetryConstants.properties.success]: TelemetryConstants.values.yes,
    });
  };
  sendEndEventWithError = (ctx: ActionContext, error: FxError) => {
    const errorCode = error.source + "." + error.name;
    const errorType =
      error instanceof SystemError
        ? TelemetryConstants.values.systemError
        : TelemetryConstants.values.userError;
    this.sendTelemetryErrorEvent(this.stage, {
      [TelemetryConstants.properties.success]: TelemetryConstants.values.no,
      [TelemetryConstants.properties.errorCode]: errorCode,
      [TelemetryConstants.properties.errorType]: errorType,
      [TelemetryConstants.properties.errorMessage]: error.message,
    });
  };
  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    this.reporter.sendTelemetryEvent(
      eventName,
      { ...properties, ...this.properties },
      { ...measurements, ...this.measurements }
    );
  }
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    this.reporter.sendTelemetryErrorEvent(
      eventName,
      { ...properties, ...this.properties },
      { ...measurements, ...this.measurements },
      this.errorProps
    );
  }
  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    this.reporter.sendTelemetryException(
      error,
      { ...properties, ...this.properties },
      { ...measurements, ...this.measurements }
    );
  }
}
