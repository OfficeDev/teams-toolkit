// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, SystemError, UserError } from "@microsoft/teamsfx-api";

import { DepsCheckerEvent } from "../../../common/deps-checker/constant/telemetry";
import { TelemetryConstants } from "../../constants";
import { RemoteTeamsAppId, TelemetryComponent } from "../constants";

export class TelemetryHelper {
  static ctx?: ContextV3;

  public static setContext(ctx: ContextV3): void {
    this.ctx = ctx;
  }

  static fillCommonProperty(properties: { [key: string]: string }): void {
    properties[TelemetryConstants.properties.component] = TelemetryComponent.api;
    properties[TelemetryConstants.properties.appId] =
      this.ctx?.envInfo?.state?.solution?.[RemoteTeamsAppId] || "";
  }

  static sendSuccessEvent(
    eventName: DepsCheckerEvent,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);
    properties[TelemetryConstants.properties.success] = TelemetryConstants.values.yes;

    this.ctx?.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendErrorEvent(
    eventName: DepsCheckerEvent,
    e: SystemError | UserError,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    this.fillCommonProperty(properties);
    properties[TelemetryConstants.properties.success] = TelemetryConstants.values.no;
    properties[TelemetryConstants.properties.errorMessage] = e.message;
    properties[TelemetryConstants.properties.errorCode] = e.name;

    if (e instanceof SystemError) {
      properties[TelemetryConstants.properties.errorType] = TelemetryConstants.values.systemError;
    } else if (e instanceof UserError) {
      properties[TelemetryConstants.properties.errorType] = TelemetryConstants.values.userError;
    }

    this.ctx?.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements, [
      TelemetryConstants.properties.errorMessage,
    ]);
  }
}
