// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxResult } from "../result";
import { PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";
import { TelemetryKeys, TelemetryValues } from "../constants";
import { PluginBot, PluginSolution } from "../resources/strings";

export class telemetryHelper {
  static fillCommonProperty(ctx: PluginContext, properties: { [key: string]: string }) {
    properties[TelemetryKeys.Component] = PluginBot.PLUGIN_NAME;
    properties[TelemetryKeys.AppId] =
      (ctx.configOfOtherPlugins
        .get(PluginSolution.PLUGIN_NAME)
        ?.get(PluginSolution.REMOTE_TEAMS_APPID) as string) || "";
  }

  static sendStartEvent(
    ctx: PluginContext,
    eventName: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    properties[TelemetryKeys.Success] = TelemetryValues.Success;
    this.fillCommonProperty(ctx, properties);

    ctx.telemetryReporter?.sendTelemetryEvent(`${eventName}-start`, properties, measurements);
  }

  static sendSuccessEvent(
    ctx: PluginContext,
    eventName: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    properties[TelemetryKeys.Success] = TelemetryValues.Success;
    this.fillCommonProperty(ctx, properties);

    ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendErrorEvent(
    ctx: PluginContext,
    eventName: string,
    e: SystemError | UserError,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    properties[TelemetryKeys.Success] = TelemetryValues.Fail;
    properties[TelemetryKeys.ErrorMessage] = e.message;
    this.fillCommonProperty(ctx, properties);
    
    if (e instanceof SystemError) {
      properties[TelemetryKeys.ErrorType] = TelemetryValues.SystemError;
    } else if (e instanceof UserError) {
      properties[TelemetryKeys.ErrorType] = TelemetryValues.UserError;
    }

    ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendResultEvent(
    ctx: PluginContext,
    eventName: string,
    result: FxResult,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    result.match(
      () => this.sendSuccessEvent(ctx, eventName, properties, measurements),
      (e: SystemError | UserError) =>
        this.sendErrorEvent(ctx, eventName, e, properties, measurements)
    );
  }
}
