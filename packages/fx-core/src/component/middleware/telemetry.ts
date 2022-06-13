// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { FxError, SystemError, TelemetryReporter } from "@microsoft/teamsfx-api";
import { TelemetryConstants } from "../constants";
import { ActionContext, ActionTelemetryReporter } from "./types";
export function TelemetryMW(stage: string, componentName: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    const telemetry = new ActionTelemetryImplement(
      actionContext.telemetryReporter,
      stage,
      componentName
    );
    actionContext.telemetry = telemetry;
    actionContext.telemetry.sendStartEvent?.(actionContext);
    await next();
    actionContext.telemetry.sendEndEvent?.(actionContext);
  };
}

export class ActionTelemetryImplement implements ActionTelemetryReporter {
  reporter: TelemetryReporter;
  constructor(reporter: TelemetryReporter, stage: string, componentName: string) {
    this.reporter = reporter;
    this.stage = stage;
    this.componentName = componentName;
    this.properties[TelemetryConstants.properties.component] = this.componentName;
  }
  stage: string;
  componentName: string;
  properties = {} as { [key: string]: string };
  measurements = {} as { [key: string]: number };
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
      errorProps
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
