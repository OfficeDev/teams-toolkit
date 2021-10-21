// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "@microsoft/teamsfx-api";
import { Telemetry, Plugins, ConfigKeysOfOtherPlugin } from "../constants";

export class TelemetryUtils {
  static ctx: PluginContext;

  public static init(ctx: PluginContext): void {
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
    TelemetryUtils.addAppIdInProperty(properties, this.ctx);
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  public static sendSuccessEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }
    properties[Telemetry.isSuccess] = Telemetry.yes;
    TelemetryUtils.sendEvent(eventName, properties, measurements);
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
    TelemetryUtils.addAppIdInProperty(properties, this.ctx);
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

  private static addAppIdInProperty(
    properties: { [key: string]: string },
    ctx: PluginContext
  ): void {
    const appId = ctx.envInfo.state
      .get(Plugins.solution)
      ?.get(ConfigKeysOfOtherPlugin.remoteTeamsAppId);
    if (appId) {
      properties[Telemetry.appId] = appId as string;
    } else {
      properties[Telemetry.appId] = "";
    }
  }
}
