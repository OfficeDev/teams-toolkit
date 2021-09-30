// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";
import { telemetryReporter } from "../core";
import * as crypto from "crypto";

export enum TelemetryProperty {
  TriggerFrom = "trigger-from",
  Component = "component",
  AppId = "appid",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  SampleAppName = "sample-app-name",
  ProjectId = "project-id",
  CorrelationId = "correlation-id",
}

export enum TelemetryEvent {
  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",
  ProjectUpgrade = "project-upgrade",
  ProjectUpgradeStart = "project-upgrade-start",
  ReadJson = "read-json",
  DecryptUserdata = "decrypt-userdata",
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no",
}

export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system",
}

export enum Component {
  vsc = "extension",
  cli = "cli",
  vs = "vs",
  core = "core",
  solution = "solution",
}

export function sendTelemetryEvent(
  component: string,
  eventName: string,
  properties?: { [p: string]: string },
  measurements?: { [p: string]: number }
): void {
  if (!properties) {
    properties = {};
  }
  properties[TelemetryProperty.Component] = component;
  telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
}

export function sendTelemetryErrorEvent(
  component: string,
  eventName: string,
  fxError: FxError,
  properties?: { [p: string]: string }
): void {
  if (!properties) {
    properties = {};
  }
  properties[TelemetryProperty.Component] = component;
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
