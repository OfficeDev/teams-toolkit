// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { Constants, Telemetry } from "../constants";

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
    properties[Telemetry.isSuccess] = Telemetry.success;
    properties[Telemetry.component] = Constants.KeyVaultPlugin.pluginName;
    TelemetryUtils.addAppIdInProperty(properties, this.ctx);
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  public static sendErrorEvent(
    eventName: string,
    errorName: string,
    errorType: string,
    errorMessage: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    if (!properties) {
      properties = {};
    }
    properties[Telemetry.isSuccess] = Telemetry.fail;
    properties[Telemetry.component] = Constants.KeyVaultPlugin.pluginName;
    properties[Telemetry.errorCode] = `${Constants.KeyVaultPlugin.shortName}.${errorName}`;
    properties[Telemetry.errorType] = errorType;
    properties[Telemetry.errorMessage] = errorMessage;
    TelemetryUtils.addAppIdInProperty(properties, this.ctx);
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      eventName,
      properties,
      measurements
    );
  }

  private static addAppIdInProperty(
    properties: { [key: string]: string },
    ctx: PluginContext
  ): void {
    const appId = ctx.envInfo.state
      .get(Constants.SolutionPlugin.id)
      ?.get(Constants.SolutionPlugin.configKeys.remoteTeamsAppId);
    if (appId) {
      properties[Telemetry.appId] = appId as string;
    } else {
      properties[Telemetry.appId] = "";
    }
  }
}
