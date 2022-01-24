// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";
import { Component, TelemetryErrorType, TelemetryProperty, TelemetrySuccess } from "../telemetry";

export enum TelemetryEvent {
  DetectPortStart = "detect-port-start",
  DetectPort = "detect-port",
}

export function sendTelemetryEvent(
  telemetryReporter: TelemetryReporter | undefined,
  eventName: string,
  properties?: { [p: string]: string },
  measurements?: { [p: string]: number }
): void {
  if (!properties) {
    properties = {};
  }
  properties[TelemetryProperty.Component] = Component.core;
  telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
}

export function sendTelemetryErrorEvent(
  telemetryReporter: TelemetryReporter | undefined,
  eventName: string,
  fxError: FxError,
  properties?: { [p: string]: string }
): void {
  if (!properties) {
    properties = {};
  }
  properties[TelemetryProperty.Component] = Component.core;
  properties[TelemetryProperty.Success] = TelemetrySuccess.No;
  if (fxError instanceof UserError) {
    properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
  } else {
    properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
  }

  properties[TelemetryProperty.ErrorCode] = `${fxError.source}.${fxError.name}`;
  properties[TelemetryProperty.ErrorMessage] = `${fxError.message}${
    fxError.stack ? "\nstack:\n" + fxError.stack : ""
  }`;

  telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, {});
}
