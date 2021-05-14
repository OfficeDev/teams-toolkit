// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export enum TelemetryEvent {
  //TODO: define CLI telemetry event
  AccountLoginStart = "login-start",
  AccountLogin = "login",

  CreateProjectStart = "create-project-start",
  CreateProject = "create-project",

  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",

  UpdateProjectStart = "add-resource-start",
  UpdateProject = "add-resource",

  AddCapStart = "add-capability-start",
  AddCap = "add-capability",

  ValidateManifestStart = "validate-manifest-start",
  ValidateManifest = "validate-manifest",

  BuildStart = "build-start",
  Build = "build",

  ProvisionStart = "provision-start",
  Provision = "provision",

  DeployStart = "deploy-start",
  Deploy = "deploy",

  PublishStart = "publish-start",
  Publish = "publish",

  InitStart = "init-start",
  Init = "init"
}

export enum TelemetryProperty {
  Component = "component",
  AppId = "appid",
  UserId = "hashed-userid",
  AccountType = "account-type",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  SampleName = "sample-name",
  Capabilities = "capabilities",
  Resources = "resources"
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
