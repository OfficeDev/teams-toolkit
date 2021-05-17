// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum TelemetryEvent {
  QuickStart = "quick-start",

  Samples = "samples",

  Documentation = "documentation",

  LoginStart = "login-start",
  Login = "login",

  SignOutStart = "sign-out-start",

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

  DebugPreCheck = "debug-precheck",
  DebugStart = "debug-start",
  DebugStop = "debug-stop",

  Survey = "survey",
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
  DebugSessionId = "session-id",
  DebugType = "type",
  DebugRequest = "request",
  DebugPort = "port",
  DebugRemote = "remote",
  Internal = "internal",
  InternalAlias = "internal-alias"
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no",
}

export enum TelemetryTiggerFrom {
  CommandPalette = "CommandPalette",
  TreeView = "TreeView",
}

export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system",
}

export enum AccountType {
  M365 = "m365",
  Azure = "azure",
}

export const TelemetryComponentType = "extension";
