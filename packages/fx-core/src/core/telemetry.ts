// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";
import { maskSecret } from "../common/stringUtils";
import { TelemetryErrorType, TelemetryProperty, TelemetrySuccess } from "../common/telemetry";

export const CoreTelemetryComponentName = "core";

export enum CoreTelemetryEvent {
  CreateStart = "create-start",
  Create = "create",
  CreateFromTdpStart = "create-tdp-start",
}

export enum CoreTelemetryProperty {
  TdpTeamsAppId = "tdp-teams-app-id",
  TdpTeamsAppFeatures = "tdp-teams-app-features",
}

export function sendErrorTelemetryThenReturnError(
  eventName: string,
  error: FxError,
  reporter?: TelemetryReporter,
  properties?: { [p: string]: string },
  measurements?: { [p: string]: number },
  errorProps?: string[]
): FxError {
  if (!properties) {
    properties = {};
  }

  if (TelemetryProperty.Component in properties === false) {
    properties[TelemetryProperty.Component] = CoreTelemetryComponentName;
  }

  properties[TelemetryProperty.Success] = TelemetrySuccess.No;
  if (error instanceof UserError) {
    properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
  } else {
    properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
  }

  properties[TelemetryProperty.ErrorCode] = `${error.source}.${error.name}`;
  properties[TelemetryProperty.ErrorMessage] = maskSecret(error.message);

  reporter?.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  return error;
}
