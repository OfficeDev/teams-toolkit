// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum TelemetryEvent {
  //TODO: define CLI telemetry event
  AccountLoginStart = "login-start",
  AccountLogin = "login",
  AccountLogoutStart = "logout-start",
  AccountLogout = "logout",

  ProvisionStart = "provision-start",
  Provision = "provision"
}

export enum TelemetryProperty {
  Component = "component",
  AapId = "appid",
  UserId = "hashed-userid",
  AccountType = "account-type",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no"
}

export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system"
}

export const TelemetryComponentType = "cli";
