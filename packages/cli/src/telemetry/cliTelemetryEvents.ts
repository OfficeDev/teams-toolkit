// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export enum TelemetryEvent {
  //TODO: define CLI telemetry event

  RootCommand = "root",

  AccountShowStart = "account-show-start",
  AccountShow = "account-show",

  AccountLoginStart = "login-start",
  AccountLogin = "login",
  AccountLoginAzure = "login-azure",
  AccountLoginM365 = "login-m365",

  AccountLogout = "logout",

  CreateProjectStart = "create-project-start",
  CreateProject = "create-project",

  InitInfraStart = "init-infra-start",
  InitInfra = "init-infra",

  InitDebugStart = "init-debug-start",
  InitDebug = "init-debug",

  InitProjectStart = "init-project-start",
  InitProject = "init-project",

  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",

  ListSample = "list-sample",

  UpdateProjectStart = "add-resource-start",
  UpdateProject = "add-resource",

  AddCapStart = "add-capability-start",
  AddCap = "add-capability",

  ValidateManifestStart = "validate-manifest-start",
  ValidateManifest = "validate-manifest",

  UpdateManifestStart = "update-manifest-start",
  UpdateManifest = "update-manifest",

  UpdateTeamsAppStart = "update-teams-app-start",
  UpdateTeamsApp = "update-teams-app",

  UpdateAadAppStart = "update-aad-app-start",
  UpdateAadApp = "update-aad-app",

  BuildStart = "build-start",
  Build = "build",

  AddCICDStart = "add-cicd-start",
  AddCICD = "add-cicd",

  ConnectExistingApiStart = "connect-existing-api-start",
  ConnectExistingApi = "connect-existing-api",

  ProvisionStart = "provision-start",
  Provision = "provision",

  ProvisionManifestStart = "provision-manifest-start",
  ProvisionManifest = "provision-manifest",

  DeployStart = "deploy-start",
  Deploy = "deploy",
  DeployAad = "deployAad",

  PublishStart = "publish-start",
  Publish = "publish",

  Preview = "preview",
  PreviewNpmInstallStart = "preview-npm-install-start",
  PreviewNpmInstall = "preview-npm-install",
  PreviewGulpCert = "preview-gulp-cert",
  PreviewGulpCertStart = "preview-gulp-cert-start",
  PreviewServiceStart = "preview-service-start",
  PreviewService = "preview-service",
  PreviewSideloading = "preview-sideloading",
  PreviewSideloadingStart = "preview-sideloading-start",
  PreviewPrereqsCheckM365Account = "preview-prereqs-check-m365-account",
  PreviewStartServices = "preview-start-services",

  ConfigGet = "config-get",
  ConfigSet = "config-set",

  CheckPermissionStart = "check-permission-start",
  CheckPermission = "check-permission",

  GrantPermissionStart = "grant-permission-start",
  GrantPermission = "grant-permission",

  EnvListStart = "env-list-start",
  EnvList = "env-list",
  CreateNewEnvironmentStart = "create-new-environment-start",
  CreateNewEnvironment = "create-new-environment",
  ResetEnvironment = "reset-environment",

  AddSsoStart = "add-sso-start",
  AddSso = "add-sso",

  AddWebpartStart = "add-webpart-start",
  AddWebpart = "add-webpart",

  UpgradeStart = "upgrade-start",
  Upgrade = "upgrade",

  Command = "command", // this event is used to track the usage of each command, including --help command

  M365Sigeloading = "m365-sideloading",
  M365Unacquire = "m365-unacquire",
  M365LaunchInfo = "m365-launch-info",

  Doctor = "doctor",

  AddCopilotPlugin = "add-copilot-plugin",
}

export enum TelemetryProperty {
  Component = "component",
  ProjectId = "project-id",
  CorrelationId = "correlation-id",
  AppId = "appid",
  TenantId = "tenant-id",
  UserId = "hashed-userid",
  AccountType = "account-type",
  Success = "success",
  Duration = "duration",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "err-message",
  SampleName = "sample-app-name",
  Capabilities = "capabilities",
  Resources = "resources",
  Internal = "internal",
  InternalAlias = "internal-alias",
  PreviewType = "preview-type",
  PreviewBrowser = "preview-browser",
  PreviewHub = "preview-hub",
  PreviewNpmInstallName = "preview-npm-install-name",
  PreviewGulpCertName = "preview-gulp-cert-name",
  PreviewNpmInstallExitCode = "preview-npm-install-exit-code",
  PreviewNpmInstallNodeVersion = "preview-npm-install-node-version",
  PreviewNpmInstallNpmVersion = "preview-npm-install-npm-version",
  PreviewNpmInstallErrorMessage = "preview-npm-install-error-message",
  PreviewServiceName = "preview-service-name",
  ListAllCollaborators = "list-all-collaborators",
  FeatureFlags = "feature-flags",
  Env = "env",
  SettingsVersion = "settings-version",
  NewProjectId = "new-project-id",
  IsM365 = "is-m365",
  IsCreatingM365 = "is-creating-m365",
  ProgrammingLanguage = "programming-language",
  HostType = "host-type",

  RunFrom = "run-from",

  // command related property
  CommandName = "command-name",
  CommandHelp = "command-help",
  CommandVersion = "command-version",
  CommandDebug = "command-debug",
  CommandVerbose = "command-verbose",
  CommandInteractive = "command-interactive",
  BinName = "bin-name", // the input binary name: teamsfx or teamsapp
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no",
}
export enum CliConfigRunFrom {
  GitHub = "GitHub",
  AzDo = "AzDo",
  Jenkins = "Jenkins",
  Other = "Other",
}
export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system",
}

export const TelemetryComponentType = "cli";
