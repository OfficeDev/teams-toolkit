// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";

export const CoreTelemetryComponentName = "core";

export enum CoreTelemetryEvent {
  CreateStart = "create-start",
  Create = "create",
  CreateFromTdpStart = "create-tdp-start",
}

export enum CoreTelemetryProperty {
  Component = "component",
  Capabilities = "capabilities",
  Success = "success",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  TdpTeamsAppId = "tdp-teams-app-id",
  TdpTeamsAppFeatures = "tdp-teams-app-features",
}

enum CoreTelemetrySuccess {
  Yes = "yes",
  No = "no",
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

  if (CoreTelemetryProperty.Component in properties === false) {
    properties[CoreTelemetryProperty.Component] = CoreTelemetryComponentName;
  }

  properties[CoreTelemetryProperty.Success] = CoreTelemetrySuccess.No;
  if (error instanceof UserError) {
    properties["error-type"] = "user";
  } else {
    properties["error-type"] = "system";
  }

  properties["error-code"] = `${error.source}.${error.name}`;
  properties["error-message"] = error.message;

  reporter?.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  return error;
}
