// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvent {
  ManageAccount = "manage-account",
  CreateAccountStart = "create-account-start",
  CreateAccount = "create-account",

  GetStarted = "quick-start",

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

  InitProjectStart = "init-project-start",
  InitProject = "init-project",

  RunIconDebugStart = "run-icon-debug-start",
  RunIconDebug = "run-icon-debug",

  AddWebpartStart = "add-web-part-start",
  AddWebpart = "add-web-part",

  ValidateManifestStart = "validate-manifest-start",
  ValidateManifest = "validate-manifest",
  ValidateApplication = "validate-application",

  UpdatePreviewManifestStart = "update-preview-manifest-start",
  UpdatePreviewManifest = "update-preview-manifest",

  EditManifestTemplate = "edit-manifest-template",
  EditAadManifestTemplate = "edit-aad-manifest-template",

  getManifestTemplatePath = "get-manifest-path",

  BuildStart = "build-start",
  Build = "build",

  BuildAadManifestStart = "build-aad-manifest-start",
  BuildAadManifest = "build-aad-manifest",

  ProvisionStart = "provision-start",
  Provision = "provision",

  DeployStart = "deploy-start",
  Deploy = "deploy",

  DeployAadManifestStart = "deploy-aad-manifest-start",
  DeployAadManifest = "deploy-aad-manifest",

  UpdateAadStart = "update-aad-start",
  UpdateAad = "update-aad",

  PublishStart = "publish-start",
  Publish = "publish",

  PublishInDeveloperPortalStart = "publish-in-developer-portal-start",
  PublishInDeveloperPortal = "publish-in-developer-portal",

  ManageTeamsApp = "manage-teams-app",

  ManageTeamsBot = "manage-teams-bot",

  ReportIssues = "report-issues",

  OpenM365Portal = "open-m365-portal",

  OpenAzurePortal = "open-azure-portal",

  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",

  CloneSample = "clone-sample",
  ViewSampleInGitHub = "view-sample-in-github",
  UpgradeToolkitForSample = "upgrade-toolkit-for-sample",
  SearchSample = "search-sample",
  ChangeLayout = "change-layout",
  SelectSample = "select-sample",
  FilterSampleAdd = "filter-sample-add",
  FilterSampleRemove = "filter-sample-remove",

  WatchVideo = "watch-video",
  PauseVideo = "pause-video",

  DisplayCommands = "display-commands",

  OpenDownloadNode = "open-download-node",

  NextStep = "next-step",

  ClickOpenLifecycleTreeview = "click-open-lifecycle-tree-view",
  ClickValidatePrerequisites = "click-validate-prerequisites",
  ClickOpenReadMe = "click-open-read-me",
  ViewGuidedTutorials = "view-guided-tutorials",
  OpenTutorial = "open-tutorial",

  GetStartedPrerequisitesStart = "get-started-prerequisites-start",
  GetStartedPrerequisites = "get-started-prerequisites",

  DebugEnvCheckStart = "debug-envcheck-start",
  DebugEnvCheck = "debug-envcheck",
  DebugPreCheckStart = "debug-precheck-start",
  DebugPreCheck = "debug-precheck",
  DebugPrerequisitesStart = "debug-prerequisites-start",
  DebugPrerequisites = "debug-prerequisites",
  DebugStart = "debug-start",
  DebugStop = "debug-stop",
  DebugNpmInstallStart = "debug-npm-install-start",
  DebugNpmInstall = "debug-npm-install",
  DebugServiceStart = "debug-service-start",
  DebugService = "debug-service",
  DebugPrereqsCheckM365Account = "debug-prereqs-check-m365-account",
  DebugPrereqsCheckM365AccountSignIn = "debug-prereqs-check-m365-account-sign-in",
  DebugPrereqsCheckM365Copilot = "debug-prereqs-check-m365-copilot",
  DebugPrereqsCheckM365Sideloading = "debug-prereqs-check-m365-sideloading",
  DebugPrereqsCheckNode = "debug-prereqs-check-node",
  DebugPrereqsCheckPorts = "debug-prereqs-check-ports",
  DebugPrereqsCheckCert = "debug-prereqs-check-cert",
  DebugPrereqsCheckDependencies = "debug-prereqs-check-dependencies",
  DebugPrereqsCheckNpmInstall = "debug-prereqs-check-npm-install",
  DebugPrereqsInstallPackages = "debug-prereqs-install-packages",
  DebugPreCheckCoreLocalDebug = "debug-precheck-core-local-debug",
  DebugTaskProvider = "debug-task-provider",
  DebugProviderResolveDebugConfiguration = "debug-provider-resolve-debug-configuration",

  DebugCheckPrerequisitesTask = "debug-check-prerequisites-task",
  DebugStartLocalTunnelTask = "debug-start-local-tunnel-task",
  DebugStartLocalTunnelTaskStarted = "debug-start-local-tunnel-task-started",
  DebugLifecycleTask = "debug-lifecycle-task",
  LaunchWebClientTask = "launch-web-client",
  DebugDevTunnelCleanNotificationStart = "debug-dev-tunnel-clean-notification-start",
  DebugDevTunnelCleanNotification = "debug-dev-tunnel-clean-notification",
  DebugDevTunnelOperationStart = "debug-dev-tunnel-operation-start",
  DebugDevTunnelOperation = "debug-dev-tunnel-operation",

  DebugAllStart = "debug-all-start",
  DebugAll = "debug-all",

  Survey = "survey",
  SurveyData = "survey-data",

  EditSecretStart = "edit-secret-start",
  EditSecret = "edit-secret",

  OpenManifestConfigStateStart = "open-manifest-config-state-start",
  OpenManifestConfigState = "open-manifest-config-state",

  OpenAadConfigStateStart = "open-aad-config-state-start",
  OpenAadConfigState = "open-aad-config-state",

  OpenTeamsApp = "open-teams-app",
  UpdateTeamsApp = "update-teams-app",

  CreateNewEnvironmentStart = "create-new-environment-start",
  CreateNewEnvironment = "create-new-environment",

  OpenSubscriptionInPortal = "open-subscription-in-portal",
  OpenResourceGroupInPortal = "open-resource-group-in-portal",

  ListCollaboratorStart = "list-collaborator-start",
  ListCollaborator = "list-collaborator",

  GrantPermissionStart = "grant-permission-start",
  GrantPermission = "grant-permission",

  ManageCollaboratorStart = "manage-collaborator-start",
  ManageCollaborator = "manage-collaborator",

  CheckPermissionStart = "check-permission-start",
  CheckPermission = "check-permission",
  OpenCopilotEnroll = "open-copilot-enroll",
  OpenSideloadingLearnMore = "open-sideloading-learn-more",
  OpenSignInJoinM365 = "open-sign-in-joinm365",

  ShowWhatIsNewNotification = "show-what-is-new-notification",
  ShowWhatIsNewContext = "show-what-is-new-context",

  ShowPreivewNotification = "show-preview-notification",

  ShowLocalDebugNotification = "show-local-debug-notification",
  ShowLocalPreviewNotification = "show-local-preview-notification",
  ClickLocalDebug = "click-local-debug",
  ClickLearnMoreWhenSwitchAccountForLocalDebug = "local-debug-switch-account-click-learn-more",
  ClickLocalPreview = "click-local-preview",
  PreviewAdaptiveCard = "open-adaptivecard-preview",

  AdaptiveCardPreviewerInstall = "acp-install",
  AdaptiveCardPreviewerInstallConfirm = "acp-install-confirm",
  AdaptiveCardPreviewerInstallCancel = "acp-install-cancel",

  PreviewManifestFile = "preview-manifest",
  PreviewAadManifestFile = "preview-aad-manifest",

  MigrateTeamsTabAppStart = "migrate-teams-tab-app-start",
  MigrateTeamsTabApp = "migrate-teams-tab-app",
  MigrateTeamsTabAppCode = "migrate-teams-tab-app-code",
  MigrateTeamsManifestStart = "migrate-teams-manifest-start",
  MigrateTeamsManifest = "migrate-teams-manifest",

  TreeViewLocalDebug = "treeview-localdebug",
  TreeViewDebugInTestTool = "treeview-debugintesttool",

  TreeViewPreviewStart = "treeview-preview-start",
  TreeViewPreview = "treeview-preview",

  ShowOutputChannel = "show-output-channel",
  OpenFolder = "open-folder",
  ClickGetHelp = "click-get-help",
  MessageDebugInTestTool = "message-debugintesttool",

  // To track the event of opening in new window after creating a new project
  OpenNewProject = "open-new-project",

  // To track the A/B test of choosing folder
  SelectFolder = "select-folder",

  // In product documentation
  InteractWithInProductDoc = "interact-with-in-product-doc",
  CopyCodeSnippet = "copy-code-snippet",
  ExpandGuideStep = "expand-guide-step",
  CollapseGuideStep = "collapse-guide-step",
  OpenExternalLink = "open-external-link",

  // ITP account help in product documentation
  ClickITPButton = "click-itp-button",

  Deactivate = "deactivate",

  // Create from developer portal
  HandleUrlFromDeveloperProtalStart = "handle-url-from-developer-portal-start",
  HandleUrlFromDeveloperProtal = "handle-url-from-developer-portal",

  // Update SDK packages
  UpdateSDKPackages = "update-sdk-packages",

  // Select to input a value when choosing between browsing local file or proceeding to input
  ContinueToInput = "continue-to-input",
  selectFileOrInputResultType = "select-file-or-input-result-type",

  // Copilot plugin
  CopilotPluginAddAPI = "copilot-plugin-add-api",

  ShowScaffoldingWarningSummary = "show-scaffolding-warning-summary",
  ShowScaffoldingWarningSummaryError = "show-scaffolding-warning-summary-error",

  FindSimilarIssues = "find-similar-issues",

  InvokeTeamsAgent = "invoke-teams-agent",

  // Copilot Chat
  CopilotChatStart = "copilot-chat-start",
  CopilotChat = "copilot-chat",
  CopilotChatFeedback = "copilot-chat-feedback",
  CopilotChatClickButton = "copilot-chat-click-button",

  //Office add-in related
  validateAddInManifest = "validate-addin-manifest",
  installAddInDependencies = "install-addin-dependencies",
  stopAddInDebug = "stop-office-addin-debug",
  generateAddInGUID = "generate-addin-guid",
  openNewOfficeAddInProject = "open-new-office-addin-project",
}

export enum TelemetryProperty {
  Component = "component",
  ProjectId = "project-id",
  CorrelationId = "correlation-id",
  AppId = "appid",
  TenantId = "tenant-id",
  UserId = "hashed-userid",
  AccountType = "account-type",
  TriggerFrom = "trigger-from",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  ErrorStack = "error-stack",
  Errors = "errors",
  Hub = "hub",
  DebugSessionId = "session-id",
  DebugType = "type",
  DebugRequest = "request",
  DebugPort = "port",
  DebugRemote = "remote",
  DebugAppId = "debug-appid",
  DebugDevCertStatus = "debug-dev-cert-status",
  DebugCheckResults = "debug-check-results",
  DebugCheckResultsSafe = "debug-check-results-safe",
  DebugErrorCodes = "debug-error-codes",
  DebugNpmInstallName = "debug-npm-install-name",
  DebugNpmInstallAlreadyInstalled = "debug-npm-install-already-installed",
  DebugNpmInstallExitCode = "debug-npm-install-exit-code",
  DebugNpmInstallErrorMessage = "debug-npm-install-error-message",
  DebugNpmInstallNodeVersion = "debug-npm-install-node-version",
  DebugNpmInstallNpmVersion = "debug-npm-install-npm-version",
  DebugServiceName = "debug-service-name",
  DebugServiceExitCode = "debug-service-exit-code",
  DebugPrereqsDepsType = "debug-prereqs-deps-type",
  DebugFailedServices = "debug-failed-services",
  DebugPortsInUse = "debug-ports-in-use",
  DebugM365AccountStatus = "debug-m365-account-status",
  DebugIsSideloadingAllowed = "debug-is-sideloading-allowed",
  DebugHasCopilotAccess = "debug-has-copilot-access",
  DebugConcurrentCorrelationId = "debug-concurrent-correlation-id",
  DebugConcurrentLastEventName = "debug-concurrent-last-event-name",
  DebugIsTransparentTask = "debug-is-transparent-task",
  DebugTaskId = "debug-task-id",
  DebugTaskArgs = "debug-task-args",
  DebugLifecycle = "debug-lifecycle",
  DebugPrelaunchTaskInfo = "debug-prelaunch-task-info",
  DebugDevTunnelOperationName = "debug-dev-tunnel-operation-name",
  DebugNgrokLog = "debug-ngrok-log",
  DebugConfigName = "debug-config-name",
  DebugDevTunnelNum = "debug-dev-tunnel-num",
  DebugTestTool = "debug-test-tool",
  DebugTestToolLog = "debug-test-tool-log",
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
  IsSpfx = "is-spfx",
  IsCreatingM365 = "is-creating-m365",
  SettingsVersion = "settings-version",
  UpdateFailedFiles = "update-failed-files",
  NewProjectId = "new-project-id",
  TeamsFxVersion = "version-teamsfx",
  TeamsJSVersion = "version-teams-js",
  BotbuilderVersion = "version-botbuilder",
  // Used with OpenTutorial
  TutorialName = "tutorial-name",
  DocumentationName = "documentation-name",
  // Used with OpenNewProject
  VscWindow = "vscode-window",
  // Used with SelectFolder
  SelectedOption = "selected-option",
  // Used with Deactivate
  Timestamp = "timestamp",
  ProgrammingLanguage = "programming-language",
  HostType = "host-type",
  // Used with ClickGetHelp
  HelpLink = "help-link",
  // Used with InteractWithInProductDoc
  Interaction = "interaction",
  Identifier = "identifier",
  ValidateMethod = "validate-method",
  // Used in Sample Gallery
  SearchText = "search-text",
  ChangedFilter = "changed-filter",
  SampleFilters = "sample-filters",
  Layout = "layout",
  // Used in ChatParticipant
  CopilotChatTokenCount = "copilot-chat-token-count",
  CopilotChatTimeToComplete = "copilot-chat-time-to-complete",
  CopilotChatFeedbackHelpful = "copilot-chat-helpful",
  CopilotChatCommand = "copilot-chat-command",
  CopilotChatRequestId = "copilot-chat-request-id",
  CopilotChatRunCommandId = "copilot-chat-run-command-id", // the id of clicked button in the response
  CopilotChatParticipantId = "copilot-chat-participant-id",
  CopilotChatLocation = "copilot-chat-location",
  CopilotChatCompleteType = "copilot-chat-complete-type",
}

export enum TelemetryMeasurements {
  Duration = "duration",
  DebugPrecheckGapDuration = "debug-precheck-gap-duration",
  DebugServicesGapDuration = "debug-services-gap-duration",
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no",
}

export enum TelemetryTriggerFrom {
  CommandPalette = "CommandPalette",
  ExternalUrl = "ExternalUrl",
  TreeView = "TreeView",
  ViewTitleNavigation = "ViewTitleNavigation",
  Webview = "Webview",
  CodeLens = "CodeLens",
  EditorTitle = "EditorTitle",
  SideBar = "SideBar",
  WalkThrough = "WalkThrough",
  Notification = "Notification",
  QuickPick = "QuickPick",
  InProductDoc = "InProductDoc",
  AccountHelp = "AccountHelp",
  SideloadingDisabled = "SideloadingDisabled",
  SampleGallery = "SampleGallery",
  SampleDetailPage = "SampleDetailPage",
  CopilotChat = "CopilotChat",
  CreateAppQuestionFlow = "CreateAppQuestionFlow",
  Other = "Other",
  Auto = "Auto",
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

export enum TelemetryDebugDevCertStatus {
  Disabled = "disabled",
  AlreadyTrusted = "already-trusted",
  Trusted = "trusted",
  NotTrusted = "not-trusted",
}

export enum VSCodeWindowChoice {
  CurrentWindow = "current-window",
  NewWindow = "new-window",
  NewWindowByDefault = "new-window-by-default",
}

export enum InProductGuideInteraction {
  Open = "open",
  Close = "close",
  Show = "show",
  Hide = "hide",
  ScrollToBottom = "scroll-to-bottom",
  RunCommand = "run-command",
}

export enum SelectFileOrInputResultType {
  LocalFile = "local-file",
  Input = "input",
}

export const TelemetryComponentType = "extension";
