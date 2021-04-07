// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "fx-api";
import { Constants, Plugins } from "../constants";

export class TelemetryUtils {
  static ctx: PluginContext;

  public static init(ctx: PluginContext) {
    TelemetryUtils.ctx = ctx;
  }

  public static sendEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    if (!properties) {
      properties = {};
    }
    properties[Constants.telemetryComponent] = Plugins.pluginNameComplex;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(
      eventName,
      properties,
      measurements
    );
  }

  public static sendException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    if (!properties) {
      properties = {};
    }
    properties[Constants.telemetryComponent] = Plugins.pluginNameComplex;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryException(
      error,
      properties,
      measurements
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
