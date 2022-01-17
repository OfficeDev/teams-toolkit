// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum TelemetryEvent {
  QuickStart = "quick-start",

  Samples = "samples",

  Documentation = "documentation",

  LoginClick = "login-click",
  LoginStart = "login-start",
  Login = "login",

  SignOutStart = "sign-out-start",
  SignOut = "sign-out",

  SelectSubscription = "select-subscription",

  CreateProjectStart = "create-project-start",
  CreateProject = "create-project",

  RunIconDebugStart = "run-icon-debug-start",
  RunIconDebug = "run-icon-debug",

  AddResourceStart = "add-resource-start",
  AddResource = "add-resource",

  AddCapStart = "add-capability-start",
  AddCap = "add-capability",

  OpenManifestEditorStart = "open-manifest-editor-start",
  OpenManifestEditor = "open-manifest-editor",

  ValidateManifestStart = "validate-manifest-start",
  ValidateManifest = "validate-manifest",

  UpdatePreviewManifestStart = "update-preview-manifest-start",
  UpdatePreviewManifest = "update-preview-manifest",

  EditManifestTemplate = "edit-manifest-template",

  getManifestTemplatePath = "get-manifest-path",

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

  CICDGuide = "cicd-guide",
  CICDInsiderGuide = "cicd-insider-guide",

  ManageTeamsApp = "manage-teams-app",

  ManageTeamsBot = "manage-teams-bot",

  ReportIssues = "report-issues",

  OpenM365Portal = "open-m365-portal",

  OpenAzurePortal = "open-azure-portal",

  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",

  WatchVideo = "watch-video",
  PauseVideo = "pause-video",

  DisplayCommands = "display-commands",

  OpenDownloadNode = "open-download-node",

  NextStep = "next-step",

  ClickQuickStartCard = "click-quick-start-card",

  DebugPreCheck = "debug-precheck",
  DebugPrerequisitesStart = "debug-prerequisites-start",
  DebugPrerequisites = "debug-prerequisites",
  DebugStart = "debug-start",
  DebugStop = "debug-stop",
  DebugFAQ = "debug-faq",
  DebugNpmInstallStart = "debug-npm-install-start",
  DebugNpmInstall = "debug-npm-install",

  Survey = "survey",
  SurveyData = "survey-data",

  EditSecretStart = "edit-secret-start",
  EditSecret = "edit-secret",

  OpenManifestConfigStateStart = "open-manifest-config-state-start",
  OpenManifestConfigState = "open-manifest-config-state",

  OpenTeamsApp = "open-teams-app",
  UpdateTeamsApp = "update-teams-app",

  CreateNewEnvironmentStart = "create-new-environment-start",
  CreateNewEnvironment = "create-new-environment",

  MigrateV1ProjectStart = "migrate-v1-project-start",
  MigrateV1Project = "migrate-v1-project",
  MigrateV1ProjectNotificationStart = "migrate-v1-project-notification-start",
  MigrateV1ProjectNotification = "migrate-v1-project-notification",

  OpenSubscriptionInPortal = "open-subscription-in-portal",
  OpenResourceGroupInPortal = "open-resource-group-in-portal",

  ListCollaboratorStart = "list-collaborator-start",
  ListCollaborator = "list-collaborator",

  ListAllCollaboratorsStart = "list-all-collaborators-start",
  ListAllCollaborators = "list-all-collaborators",

  GrantPermissionStart = "grant-permission-start",
  GrantPermission = "grant-permission",

  CheckPermissionStart = "check-permission-start",
  CheckPermission = "check-permission",
  OpenSideloadingJoinM365 = "open-sideloading-joinm365",
  OpenSideloadingReadmore = "open-sideloading-readmore",

  ShowWhatIsNewNotification = "show-what-is-new-notification",
  ShowWhatIsNewContext = "show-what-is-new-context",

  ShowLocalDebugNotification = "show-local-debug-notification",
  ClickLocalDebug = "click-local-debug",
  ClickChangeLocation = "click-change-location",
  PreviewAdaptiveCard = "open-adaptivecard-preview",

  PreviewManifestFile = "preview-manifest",

  MigrateTeamsTabAppStart = "migrate-teams-tab-app-start",
  MigrateTeamsTabApp = "migrate-teams-tab-app",
  MigrateTeamsTabAppCode = "migrate-teams-tab-app-code",
  MigrateTeamsManifestStart = "migrate-teams-manifest-start",
  MigrateTeamsManifest = "migrate-teams-manifest",

  TreeViewLocalDebug = "treeview-localdebug",

  TreeViewPreviewStart = "treeview-preview-start",
  TreeViewPreview = "treeview-preview",
}

export enum TelemetryProperty {
  Component = "component",
  ProjectId = "project-id",
  CorrelationId = "correlation-id",
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
  DebugAppId = "debug-appid",
  DebugNpmInstallName = "debug-npm-install-name",
  DebugNpmInstallExitCode = "debug-npm-install-exit-code",
  DebugNpmInstallErrorMessage = "debug-npm-install-error-message",
  DebugNpmInstallNodeVersion = "debug-npm-install-node-version",
  DebugNpmInstallNpmVersion = "debug-npm-install-npm-version",
  DebugFAQSelection = "debug-faq-selection",
  Internal = "internal",
  InternalAlias = "internal-alias",
  OSArch = "os-arch",
  OSRelease = "os-release",
  SampleAppName = "sample-app-name",
  CurrentAction = "current-action",
  VideoPlayFrom = "video-play-from",
  FeatureFlags = "feature-flags",
  UpdateTeamsAppReason = "update-teams-app-reason",
  IsExistingUser = "is-existing-user",
  CollaborationState = "collaboration-state",
  Env = "env",
  SourceEnv = "sourceEnv",
  TargetEnv = "targetEnv",
  IsFromSample = "is-from-sample",
  SettingsVersion = "settings-version",
  UpdateFailedFiles = "update-failed-files",
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no",
}

export enum TelemetryTiggerFrom {
  CommandPalette = "CommandPalette",
  TreeView = "TreeView",
  Webview = "Webview",
  CodeLens = "CodeLens",
  EditorTitle = "EditorTitle",
  SideBar = "SideBar",
  Other = "Other",
  Unknow = "Unknow",
}

export enum WatchVideoFrom {
  WatchVideoBtn = "WatchVideoBtn",
  PlayBtn = "PlayBtn",
  WatchOnBrowserBtn = "WatchOnBrowserBtn",
}

export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system",
}

export enum AccountType {
  M365 = "m365",
  Azure = "azure",
}

export enum TelemetryUpdateAppReason {
  Manual = "manual",
  AfterDelay = "afterDelay",
  FocusOut = "focusOut",
}

export enum TelemetrySurveyDataProperty {
  Q1Title = "q1-title",
  Q1Result = "q1-result",
  Q2Title = "q2-title",
  Q2Result = "q2-result",
  Q3Title = "q3-title",
  Q3Result = "q3-result",
  Q4Title = "q4-title",
  Q4Result = "q4-result",
  Q5Title = "q5-title",
  Q5Result = "q5-result",
}

export const TelemetryComponentType = "extension";
