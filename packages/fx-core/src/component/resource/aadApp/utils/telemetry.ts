// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { globalVars, TOOLS } from "../../../../core/globalVars";
import { Plugins, Telemetry } from "../constants";

export class TelemetryUtils {
  public static sendEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }
    properties[Telemetry.component] = Plugins.pluginNameComplex;
    TelemetryUtils.addAppIdInProperty(properties);
    TOOLS.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
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
    properties[Telemetry.isSuccess] = Telemetry.no;
    TelemetryUtils.addAppIdInProperty(properties);
    TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements);
  }

  private static addAppIdInProperty(properties: { [key: string]: string }): void {
    const appId = globalVars.teamsAppId || "";
    properties[Telemetry.appId] = appId as string;
  }
}
