// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DependentPluginInfo,
  FrontendPluginInfo,
  TelemetryEvent,
  TelemetryKey,
  TelemetryValue,
} from "../constants";
import { PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";
import { ErrorType, FrontendPluginError } from "../resources/errors";

export class TelemetryHelper {
  private static ctx?: PluginContext;
  private static component?: string;

  static setContext(ctx: PluginContext, component?: string): void {
    this.ctx = ctx;
    this.component = component;
  }

  private static fillCommonProperty(properties: { [key: string]: string }): void {
    properties[TelemetryKey.Component] = this.component ?? FrontendPluginInfo.PluginName;
    properties[TelemetryKey.AppId] =
      (this.ctx?.envInfo.state
        .get(DependentPluginInfo.SolutionPluginName)
        ?.get(DependentPluginInfo.RemoteTeamsAppId) as string) || "";
  }

  static sendStartEvent(
    eventName: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    TelemetryHelper.fillCommonProperty(properties);

    this.ctx?.telemetryReporter?.sendTelemetryEvent(
      eventName + TelemetryEvent.StartSuffix,
      properties,
      measurements
    );
  }

  static sendSuccessEvent(
    eventName: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    TelemetryHelper.fillCommonProperty(properties);
    properties[TelemetryKey.Success] = TelemetryValue.Success;

    this.ctx?.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendErrorEvent(
    eventName: string,
    e: SystemError | UserError | FrontendPluginError,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    TelemetryHelper.fillCommonProperty(properties);
    properties[TelemetryKey.Success] = TelemetryValue.Fail;

    properties[TelemetryKey.ErrorMessage] = e.message;
    properties[TelemetryKey.ErrorCode] = e.name;
    if (e instanceof SystemError) {
      properties[TelemetryKey.ErrorType] = TelemetryValue.SystemError;
    } else if (e instanceof UserError) {
      properties[TelemetryKey.ErrorType] = TelemetryValue.UserError;
    } else if (e instanceof FrontendPluginError) {
      properties[TelemetryKey.ErrorType] =
        e.errorType === ErrorType.User ? TelemetryValue.UserError : TelemetryValue.SystemError;
      properties[TelemetryKey.ErrorCode] = e.code;
    }

    this.ctx?.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements, [
      TelemetryKey.ErrorMessage,
    ]);
  }

  static sendScaffoldFallbackEvent(
    message: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    TelemetryHelper.fillCommonProperty(properties);
    properties[TelemetryKey.ErrorMessage] = message;

    this.ctx?.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.ScaffoldFallback,
      properties,
      measurements
    );
  }

  static sendGeneralEvent(
    eventName: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    TelemetryHelper.fillCommonProperty(properties);
    this.ctx?.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }
}
