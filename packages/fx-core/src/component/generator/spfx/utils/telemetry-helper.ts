// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, SystemError, UserError } from "@microsoft/teamsfx-api";
import { maskSecret } from "../../../../common/stringUtils";
import {
  TelemetryErrorType,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../../common/telemetry";
import { Constants } from "./constants";

export class telemetryHelper {
  static sendSuccessEvent(
    ctx: Context,
    eventName: string,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    properties[TelemetryProperty.Component] = Constants.PLUGIN_DEV_NAME;
    properties[TelemetryProperty.Success] = TelemetrySuccess.Yes;

    ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  static sendErrorEvent(
    ctx: Context,
    eventName: string,
    e: SystemError | UserError,
    properties: { [key: string]: string } = {},
    measurements: { [key: string]: number } = {}
  ): void {
    properties[TelemetryProperty.Component] = Constants.PLUGIN_DEV_NAME;
    properties[TelemetryProperty.Success] = TelemetrySuccess.No;

    if (e instanceof SystemError) {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
    } else if (e instanceof UserError) {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
    }
    properties[TelemetryProperty.ErrorMessage] = maskSecret(e.message);
    properties[TelemetryProperty.ErrorCode] = e.name;

    ctx.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements);
  }
}
