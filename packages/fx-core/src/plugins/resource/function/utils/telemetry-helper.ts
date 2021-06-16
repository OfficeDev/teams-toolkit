// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";

import { CommonConstants, DependentPluginInfo, FunctionPluginInfo } from "../constants";
import { FxResult } from "../result";
import { FunctionEvent, TelemetryKey, TelemetryValue } from "../enums";
import { DepsCheckerEvent } from "./depsChecker/common";

export class TelemetryHelper {
  static fillCommonProperty(ctx: PluginContext, properties: { [key: string]: string }) {
    properties[TelemetryKey.Component] = FunctionPluginInfo.pluginName;
    properties[TelemetryKey.AppId] =
      (ctx.configOfOtherPlugins
        .get(DependentPluginInfo.solutionPluginName)
        ?.get(DependentPluginInfo.remoteTeamsAppId) as string) || CommonConstants.emptyString;
  }

  static sendStartEvent(
    ctx: PluginContext,
    eventName: FunctionEvent,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(ctx, properties);

    ctx.telemetryReporter?.sendTelemetryEvent(`${eventName}-start`, properties, measurements);
  }

  static sendSuccessEvent(
    ctx: PluginContext,
    eventName: FunctionEvent | DepsCheckerEvent,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(ctx, properties);
    properties[TelemetryKey.Success] = TelemetryValue.Success;

    ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendErrorEvent(
    ctx: PluginContext,
    eventName: FunctionEvent | DepsCheckerEvent,
    e: SystemError | UserError,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(ctx, properties);
    properties[TelemetryKey.Success] = TelemetryValue.Fail;
    properties[TelemetryKey.ErrorMessage] = e.message;
    properties[TelemetryKey.ErrorCode] = e.name;

    if (e instanceof SystemError) {
      properties[TelemetryKey.ErrorType] = TelemetryValue.SystemError;
    } else if (e instanceof UserError) {
      properties[TelemetryKey.ErrorType] = TelemetryValue.UserError;
    }

    ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendResultEvent(
    ctx: PluginContext,
    eventName: FunctionEvent | DepsCheckerEvent,
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
