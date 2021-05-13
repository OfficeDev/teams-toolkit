// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "@microsoft/teamsfx-api";
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
    properties[Telemetry.isSuccess] = Telemetry.success;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  public static sendErrorEvent(
    eventName: string,
    errorName: string,
    errorType: string,
    errorMessage: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    properties[Telemetry.component] = Plugins.pluginNameComplex;
    properties[Telemetry.errorCode] = `${Plugins.pluginNameShort}.${errorName}`;
    properties[Telemetry.errorType] = errorType;
    properties[Telemetry.errorMessage] = errorMessage;
    properties[Telemetry.isSuccess] = Telemetry.fail;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      eventName,
      properties,
      measurements
    );
  }

  static readonly getErrorProperty = (errorType: string, errorMessage: string) => {
    return {
      "error-type": errorType,
      "error-message": errorMessage,
    };
  };
}
