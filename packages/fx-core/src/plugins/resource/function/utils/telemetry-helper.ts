// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";

import { CommonConstants, DependentPluginInfo, FunctionPluginInfo } from "../constants";
import { FxResult } from "../result";
import { FunctionEvent, TelemetryKey, TelemetryValue } from "../enums";
import { DepsCheckerEvent } from "../../../../common/deps-checker/constant/telemetry";

export class TelemetryHelper {
  static ctx?: PluginContext | ContextV3;

  public static setContext(ctx: PluginContext | ContextV3): void {
    this.ctx = ctx;
  }

  static fillCommonProperty(properties: { [key: string]: string }): void {
    properties[TelemetryKey.Component] = FunctionPluginInfo.pluginName;
    if (this.ctx?.envInfo?.state instanceof Map) {
      properties[TelemetryKey.AppId] =
        (this.ctx?.envInfo?.state
          .get(DependentPluginInfo.solutionPluginName)
          ?.get(DependentPluginInfo.remoteTeamsAppId) as string) || CommonConstants.emptyString;
    } else {
      properties[TelemetryKey.AppId] =
        this.ctx?.envInfo?.state?.solution?.[DependentPluginInfo.remoteTeamsAppId] ||
        CommonConstants.emptyString;
    }
  }

  static sendStartEvent(
    eventName: FunctionEvent,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);

    this.ctx?.telemetryReporter?.sendTelemetryEvent(`${eventName}-start`, properties, measurements);
  }

  static sendSuccessEvent(
    eventName: FunctionEvent | DepsCheckerEvent,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);
    properties[TelemetryKey.Success] = TelemetryValue.Success;

    this.ctx?.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendErrorEvent(
    eventName: FunctionEvent | DepsCheckerEvent,
    e: SystemError | UserError,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);
    properties[TelemetryKey.Success] = TelemetryValue.Fail;
    properties[TelemetryKey.ErrorMessage] = e.message;
    properties[TelemetryKey.ErrorCode] = e.name;

    if (e instanceof SystemError) {
      properties[TelemetryKey.ErrorType] = TelemetryValue.SystemError;
    } else if (e instanceof UserError) {
      properties[TelemetryKey.ErrorType] = TelemetryValue.UserError;
    }

    this.ctx?.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements, [
      TelemetryKey.ErrorMessage,
    ]);
  }

  static sendResultEvent(
    eventName: FunctionEvent | DepsCheckerEvent,
    result: FxResult,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    result.match(
      () => this.sendSuccessEvent(eventName, properties, measurements),
      (e: SystemError | UserError) => this.sendErrorEvent(eventName, e, properties, measurements)
    );
  }

  static sendScaffoldFallbackEvent(
    message: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);
    properties[TelemetryKey.ErrorMessage] = message;

    this.ctx?.telemetryReporter?.sendTelemetryEvent(
      FunctionEvent.scaffoldFallback,
      properties,
      measurements
    );
  }

  static sendGeneralEvent(
    eventName: FunctionEvent | DepsCheckerEvent,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);
    this.ctx?.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }
}
