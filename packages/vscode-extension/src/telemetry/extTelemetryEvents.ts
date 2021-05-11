// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum TelemetryEvent {
  QuickStart = "quick-start",

  Samples = "samples",

  Documentation = "documentation",

  LoginStart = "login-start",
  Login = "login",

  LoginAzure = "login-azure",

  LoginM365 = "login-m365",

  SignOutAzure = "sign-out-azure",

  SignOutM365 = "sign-out-m365",

  CreateProjectStart = "create-project-start",
  CreateProject = "create-project",

  UpdateProjectStart = "add-resource-start",
  UpdateProject = "add-resource",

  AddCapStart = "add-capability-start",
  AddCap = "add-capability",

  OpenManifestEditorStart = "open-manifest-editor-start",
  OpenManifestEditor = "open-manifest-editor",

  ValidateManifestStart = "validate-manifest-start",
  ValidateManifest = "validate-manifest",

  BuildStart = "build-start",
  Build = "build",

  ProvisionStart = "provision-start",
  Provision = "provision",

  DeployStart = "deploy-start",
  Deploy = "deploy",

  UpdateAadStart = "update-aad-start",
  UpdateAad = "update-aad",

  PublishStart = "publish-start",
  Publish = "publish",

  ManageTeamsApp = "manage-teams-app",

  ManageTeamsBot = "manage-teams-bot",

  ReportIssues = "report-issues",

  OpenM365Portal = "open-m365-portal",

  OpenAzurePortal = "open-azure-portal",

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
