// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, UserError } from "@microsoft/teamsfx-api";
import { Telemetry, Plugins } from "../constants";

export class TelemetryUtils {
  static ctx: PluginContext;

  public static init(ctx: PluginContext) {
    TelemetryUtils.ctx = ctx;
  }

  public static sendEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }
    properties[Telemetry.component] = Plugins.pluginNameComplex;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(
      eventName,
      properties,
      measurements
    );
  }

  public static sendException(
    eventName: string,
    errorCode: string,
    errorType: string,
    errorMessage: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }
    
    properties[Telemetry.component] = Plugins.pluginNameComplex;
    properties[Telemetry.errorCode] = errorCode;
    properties[Telemetry.errorType] = errorType;
    properties[Telemetry.errorMessage] = errorMessage;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(
      eventName,
      properties,
      measurements,
    );
  }

  static readonly getErrorProperty = (
    errorType: string,
    errorMessage: string
  ) => {
    return {
      "error-type": errorType,
      "error-message": errorMessage,
    };
  };
}
