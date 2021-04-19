// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum TelemetryEvent {
  LoginStart = "login-start",
  Login = "login",

  CreateProjectStart = "create-project-start",
  CreateProject = "create-project",

  BuildProjectStart = "build-project-start",
  BuildProject = "build-project",

  UpdateProjectStart = "add-resource-start",
  UpdateProject = "add-resource",

  AddCapStart = "add-capability-start",
  AddCap = "add-capability",

  OpenManifestEditor = "open-manifest-editor",

  ValidateManifest = "validate-manifest",
  BuildPackage = "build-package",

  ProvisionStart = "provision-start",
  Provision = "provision",

  DeployStart = "deploy-start",
  Deploy = "deploy",

  UpdateAadStart = "update-aad-start",
  UpdateAad = "update-aad",

  PublishStart = "publish-start",

  F5Start = "f5-start",
  F5 = "f5",

  Survey = "survey"
}

export enum TelemetryProperty {
  Component = "component",
  AapId = "appid",
  UserId = "hashed-userid",
  AccountType = "account-type",
  TriggerFrom = "trigger-from",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  DebugSessionId = "session-id"
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no"
}

export enum TelemetryTiggerFrom {
  CommandPalette = "CommandPalette",
  TreeView = "TreeView"
}

export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system"
}

export const TelemetryComponentType = "extension";
