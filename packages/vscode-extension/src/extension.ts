// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  AppPackageFolderName,
  BuildFolderName,
  ConfigFolderName,
  CreateProjectResult,
  FxError,
  Result,
} from "@microsoft/teamsfx-api";
import {
  AuthSvcScopes,
  FeatureFlags as CoreFeatureFlags,
  Correlator,
  VersionState,
  featureFlagManager,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as semver from "semver";
import * as vscode from "vscode";
import {
  CHAT_EXECUTE_COMMAND_ID,
  CHAT_OPENURL_COMMAND_ID,
  IsChatParticipantEnabled,
  chatParticipantId,
} from "./chat/consts";
import followupProvider from "./chat/followupProvider";
import {
  chatExecuteCommandHandler,
  chatRequestHandler,
  handleFeedback,
  openUrlCommandHandler,
} from "./chat/handlers";
import {
  AadAppTemplateCodeLensProvider,
  ApiPluginCodeLensProvider,
  CopilotPluginCodeLensProvider,
  CryptoCodeLensProvider,
  ManifestTemplateCodeLensProvider,
  OfficeDevManifestCodeLensProvider,
  PermissionsJsonFileCodeLensProvider,
  ProjectSettingsCodeLensProvider,
  TeamsAppYamlCodeLensProvider,
} from "./codeLensProvider";
import commandController from "./commandController";
import azureAccountManager from "./commonlib/azureLogin";
import VsCodeLogInstance from "./commonlib/log";
import M365TokenInstance from "./commonlib/m365Login";
import { configMgr } from "./config";
import { CommandKey as CommandKeys } from "./constants";
import { openWelcomePageAfterExtensionInstallation } from "./controls/openWelcomePage";
import { TeamsFxTaskType } from "./debug/common/debugConstants";
import { getLocalDebugSessionId, startLocalDebugSession } from "./debug/common/localDebugSession";
import { registerOfficeTaskAndDebugEvents } from "./debug/officeTaskHandler";
import { disableRunIcon, registerRunIcon } from "./debug/runIconHandler";
import { TeamsfxDebugProvider } from "./debug/teamsfxDebugProvider";
import { registerTeamsfxTaskAndDebugEvents } from "./debug/teamsfxTaskHandler";
import { TeamsfxTaskProvider } from "./debug/teamsfxTaskProvider";
import { showError } from "./error/common";
import * as exp from "./exp";
import { TreatmentVariableValue, TreatmentVariables } from "./exp/treatmentVariables";
import { FeatureFlags } from "./featureFlags";
import {
  initializeGlobalVariables,
  isExistingUser,
  isOfficeAddInProject,
  isOfficeManifestOnlyProject,
  isSPFxProject,
  isTeamsFxProject,
  unsetIsTeamsFxProject,
  workspaceUri,
} from "./globalVariables";
import {
  editAadManifestTemplateHandler,
  openPreviewAadFileHandler,
  updateAadAppManifestHandler,
} from "./handlers/aadManifestHandlers";
import {
  azureAccountSignOutHelpHandler,
  cmpAccountsHandler,
  createAccountHandler,
} from "./handlers/accounts/accountHandlers";
import { activate as activateHandlers } from "./handlers/activate";
import { autoOpenProjectHandler } from "./handlers/autoOpenProjectHandler";
import {
  checkCopilotCallback,
  checkSideloadingCallback,
} from "./handlers/accounts/checkAccessCallback";
import { checkCopilotAccessHandler } from "./handlers/accounts/checkCopilotAccess";
import { manageCollaboratorHandler } from "./handlers/collaboratorHandlers";
import {
  openFolderHandler,
  openLifecycleTreeview,
  openSamplesHandler,
  openWelcomeHandler,
  saveTextDocumentHandler,
} from "./handlers/controlHandlers";
import * as copilotChatHandlers from "./handlers/copilotChatHandlers";
import {
  debugInTestToolHandler,
  selectAndDebugHandler,
  treeViewLocalDebugHandler,
  treeViewPreviewHandler,
} from "./handlers/debugHandlers";
import { decryptSecret } from "./handlers/decryptSecret";
import { downloadSampleApp } from "./handlers/downloadSample";
import {
  createNewEnvironment,
  openConfigStateFile,
  refreshEnvironment,
} from "./handlers/envHandlers";
import {
  addWebpartHandler,
  copilotPluginAddAPIHandler,
  createNewProjectHandler,
  deployHandler,
  provisionHandler,
  publishHandler,
  scaffoldFromDeveloperPortalHandler,
} from "./handlers/lifecycleHandlers";
import {
  buildPackageHandler,
  publishInDeveloperPortalHandler,
  updatePreviewManifest,
  validateManifestHandler,
} from "./handlers/manifestHandlers";
import {
  migrateTeamsManifestHandler,
  migrateTeamsTabAppHandler,
} from "./handlers/migrationHandler";
import * as officeDevHandlers from "./handlers/officeDevHandlers";
import {
  openAccountLinkHandler,
  openAppManagement,
  openAzureAccountHandler,
  openBotManagement,
  openDevelopmentLinkHandler,
  openDocumentHandler,
  openDocumentLinkHandler,
  openEnvLinkHandler,
  openExternalHandler,
  openHelpFeedbackLinkHandler,
  openLifecycleLinkHandler,
  openM365AccountHandler,
  openReportIssues,
  openResourceGroupInPortal,
  openSubscriptionInPortal,
} from "./handlers/openLinkHandlers";
import {
  checkUpgrade,
  getDotnetPathHandler,
  getPathDelimiterHandler,
  installAdaptiveCardExt,
  triggerV3MigrationHandler,
  validateGetStartedPrerequisitesHandler,
} from "./handlers/prerequisiteHandlers";
import { openReadMeHandler } from "./handlers/readmeHandlers";
import {
  refreshCopilotCallback,
  refreshSideloadingCallback,
} from "./handlers/accounts/refreshAccessHandlers";
import { showOutputChannelHandler } from "./handlers/showOutputChannel";
import { signinAzureCallback, signinM365Callback } from "./handlers/accounts/signinAccountHandlers";
import { openTutorialHandler, selectTutorialsHandler } from "./handlers/tutorialHandlers";
import {
  createProjectFromWalkthroughHandler,
  openBuildIntelligentAppsWalkthroughHandler,
} from "./handlers/walkthrough";
import { ManifestTemplateHoverProvider } from "./hoverProvider";
import {
  CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
  officeChatParticipantId,
} from "./officeChat/consts";
import {
  chatCreateOfficeProjectCommandHandler,
  handleOfficeFeedback,
  officeChatRequestHandler,
} from "./officeChat/handlers";
import { initVSCodeUI } from "./qm/vsc_ui";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "./telemetry/extTelemetryEvents";
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import officeDevTreeViewManager from "./treeview/officeDevTreeViewManager";
import { TreeViewCommand } from "./treeview/treeViewCommand";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { UriHandler, setUriEventHandler } from "./uriHandler";
import { signOutAzure, signOutM365 } from "./utils/accountUtils";
import { acpInstalled, delay, hasAdaptiveCardInWorkspace } from "./utils/commonUtils";
import { updateAutoOpenGlobalKey } from "./utils/globalStateUtils";
import { loadLocalizedStrings } from "./utils/localizeUtils";
import { checkProjectTypeAndSendTelemetry, isM365Project } from "./utils/projectChecker";
import { ReleaseNote } from "./utils/releaseNote";
import { ExtensionSurvey } from "./utils/survey";
import { getSettingsVersion, projectVersionCheck } from "./utils/telemetryUtils";

export async function activate(context: vscode.ExtensionContext) {
  process.env[FeatureFlags.ChatParticipant] = (
    IsChatParticipantEnabled &&
    semver.gte(vscode.version, "1.90.0-insider") &&
    vscode.version.includes("insider")
  ).toString();

  configMgr.registerConfigChangeCallback();

  context.subscriptions.push(new ExtTelemetry.Reporter(context));

  initVSCodeUI(context);
  initializeGlobalVariables(context);
  loadLocalizedStrings();

  const uriHandler = new UriHandler();
  setUriEventHandler(uriHandler);
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  registerActivateCommands(context);

  registerInternalCommands(context);

  if (featureFlagManager.getBooleanValue(CoreFeatureFlags.ChatParticipant)) {
    registerChatParticipant(context);

    registerOfficeChatParticipant(context);
  }

  if (isTeamsFxProject) {
    activateTeamsFxRegistration(context);
  }

  if (isOfficeAddInProject) {
    activateOfficeDevRegistration(context);
  }

  // Call activate function of toolkit core.
  activateHandlers();

  // Init VSC context key
  await initializeContextKey(context, isTeamsFxProject);

  // UI is ready to show & interact
  await vscode.commands.executeCommand("setContext", "fx-extension.isTeamsFx", isTeamsFxProject);

  // control whether to show chat participant entries
  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isChatParticipantEnabled",
    featureFlagManager.getBooleanValue(CoreFeatureFlags.ChatParticipant)
  );

  // Flags for "Build Intelligent Apps" walkthrough.
  // DEVEOP_COPILOT_PLUGIN: boolean in vscode settings
  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isApiCopilotPluginEnabled",
    featureFlagManager.getBooleanValue(CoreFeatureFlags.CopilotPlugin)
  );

  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isOfficeAddIn",
    isOfficeAddInProject
  );

  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isManifestOnlyOfficeAddIn",
    isOfficeManifestOnlyProject
  );

  void VsCodeLogInstance.info("Teams Toolkit extension is now active!");

  // Don't wait this async method to let it run in background.
  void runBackgroundAsyncTasks(context, isTeamsFxProject);
  await vscode.commands.executeCommand("setContext", "fx-extension.initialized", true);
}

// this method is called when your extension is deactivated
export async function deactivate() {
  await ExtTelemetry.cacheTelemetryEventAsync(TelemetryEvent.Deactivate);
  await ExtTelemetry.dispose();
  TreeViewManagerInstance.dispose();
  await disableRunIcon();
}

function activateTeamsFxRegistration(context: vscode.ExtensionContext) {
  registerTreeViewCommandsInDevelopment(context);
  registerTreeViewCommandsInLifecycle(context);
  registerTreeViewCommandsInHelper(context);
  registerTeamsFxCommands(context);
  registerMenuCommands(context);
  registerAccountMenuCommands(context);

  TreeViewManagerInstance.registerTreeViews(context);
  accountTreeViewProviderInstance.subscribeToStatusChanges({
    azureAccountProvider: azureAccountManager,
    m365TokenProvider: M365TokenInstance,
  });
  // Set region for M365 account every
  void M365TokenInstance.setStatusChangeMap(
    "set-region",
    { scopes: AuthSvcScopes },
    async (status, token, accountInfo) => {
      if (status === "SignedIn") {
        const tokenRes = await M365TokenInstance.getAccessToken({ scopes: AuthSvcScopes });
        if (tokenRes.isOk()) {
          await teamsDevPortalClient.setRegionEndpointByToken(tokenRes.value);
        }
      }
    }
  );

  if (vscode.workspace.isTrusted) {
    registerCodelensAndHoverProviders(context);
  }

  registerDebugConfigProviders(context);

  // Register task and debug event handlers, as well as sending telemetries
  registerTeamsfxTaskAndDebugEvents();

  registerRunIcon().catch(() => {
    // do nothing
  });

  // Register teamsfx task provider
  const taskProvider: TeamsfxTaskProvider = new TeamsfxTaskProvider();
  context.subscriptions.push(vscode.tasks.registerTaskProvider(TeamsFxTaskType, taskProvider));
  context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(saveTextDocumentHandler));
}

function activateOfficeDevRegistration(context: vscode.ExtensionContext) {
  registerOfficeDevMenuCommands(context);
  officeDevTreeViewManager.registerOfficeDevTreeViews(context);
  if (vscode.workspace.isTrusted) {
    registerOfficeDevCodeLensProviders(context);
  }

  // Register task and debug event handlers, as well as sending telemetries
  registerOfficeTaskAndDebugEvents();
}

/**
 * Commands that always show in command palette. They will activate extension and wait for its completion.
 * They are usually used in welcome view and walkthrough.
 */
function registerActivateCommands(context: vscode.ExtensionContext) {
  // non-teamsfx project upgrade
  const checkUpgradeCmd = vscode.commands.registerCommand(
    "fx-extension.checkProjectUpgrade",
    (...args) => Correlator.run(checkUpgrade, args)
  );
  context.subscriptions.push(checkUpgradeCmd);

  // user can manage account in non-teamsfx project
  const cmpAccountsCmd = vscode.commands.registerCommand("fx-extension.cmpAccounts", (...args) =>
    Correlator.run(cmpAccountsHandler, args)
  );
  context.subscriptions.push(cmpAccountsCmd);

  // Create a new Teams app
  registerInCommandController(
    context,
    CommandKeys.Create,
    createNewProjectHandler,
    "createProject"
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("fx-extension.createFromWalkthrough", async (...args) => {
      const res: Result<CreateProjectResult, FxError> = await Correlator.run(
        createProjectFromWalkthroughHandler,
        args
      );
      if (res.isOk()) {
        const fileUri = vscode.Uri.file(res.value.projectPath);
        const warnings = res.value.warnings;
        await updateAutoOpenGlobalKey(true, fileUri, warnings, args);
        await ExtTelemetry.dispose();
        await delay(2000);
        return { openFolder: fileUri };
      }
    })
  );

  // Show lifecycle view
  const openLifecycleTreeviewCmd = vscode.commands.registerCommand(
    "fx-extension.openLifecycleTreeview",
    (...args) => Correlator.run(openLifecycleTreeview, args)
  );
  context.subscriptions.push(openLifecycleTreeviewCmd);

  // Documentation
  registerInCommandController(context, CommandKeys.OpenDocument, openDocumentHandler);

  // README
  registerInCommandController(context, CommandKeys.OpenReadMe, openReadMeHandler);

  // View samples
  registerInCommandController(context, CommandKeys.OpenSamples, openSamplesHandler);

  // Quick start
  registerInCommandController(context, CommandKeys.OpenWelcome, openWelcomeHandler);
  registerInCommandController(
    context,
    CommandKeys.BuildIntelligentAppsWalkthrough,
    openBuildIntelligentAppsWalkthroughHandler
  );

  // Tutorials
  registerInCommandController(context, "fx-extension.selectTutorials", selectTutorialsHandler);

  // Sign in to M365
  registerInCommandController(context, CommandKeys.SigninM365, signinM365Callback);

  // Prerequisites check
  registerInCommandController(
    context,
    CommandKeys.ValidateGetStartedPrerequisites,
    validateGetStartedPrerequisitesHandler
  );

  // commmand: check copilot access
  registerInCommandController(context, CommandKeys.CheckCopilotAccess, checkCopilotAccessHandler);

  // Upgrade command to update Teams manifest
  const migrateTeamsManifestCmd = vscode.commands.registerCommand(
    "fx-extension.migrateTeamsManifest",
    () => Correlator.run(migrateTeamsManifestHandler)
  );
  context.subscriptions.push(migrateTeamsManifestCmd);

  // Upgrade command to update Teams Client SDK
  const migrateTeamsTabAppCmd = vscode.commands.registerCommand(
    "fx-extension.migrateTeamsTabApp",
    () => Correlator.run(migrateTeamsTabAppHandler)
  );
  context.subscriptions.push(migrateTeamsTabAppCmd);

  // Register local debug run icon
  const runIconCmd = vscode.commands.registerCommand("fx-extension.selectAndDebug", (...args) =>
    Correlator.run(selectAndDebugHandler, args)
  );
  context.subscriptions.push(runIconCmd);

  // Register invoke teams agent command
  const invokeTeamsAgent = vscode.commands.registerCommand("fx-extension.invokeChat", (...args) =>
    Correlator.run(copilotChatHandlers.invokeTeamsAgent, args)
  );
  context.subscriptions.push(invokeTeamsAgent);
}

/**
 * Internal commands that will not show in command palette and only be called via executeCommand()
 */
function registerInternalCommands(context: vscode.ExtensionContext) {
  registerInCommandController(
    context,
    "fx-extension.openFromTdp",
    scaffoldFromDeveloperPortalHandler,
    "openFromTdp"
  );

  const showOutputChannel = vscode.commands.registerCommand(
    "fx-extension.showOutputChannel",
    (...args) => Correlator.run(showOutputChannelHandler, args)
  );
  context.subscriptions.push(showOutputChannel);

  const createSampleCmd = vscode.commands.registerCommand(
    CommandKeys.DownloadSample,
    (...args: unknown[]) => Correlator.run(downloadSampleApp, ...args)
  );
  context.subscriptions.push(createSampleCmd);

  // Register backend extensions install command
  const backendExtensionsInstallCmd = vscode.commands.registerCommand(
    "fx-extension.backend-extensions-install",
    () => Correlator.runWithId(getLocalDebugSessionId(), triggerV3MigrationHandler)
  );
  context.subscriptions.push(backendExtensionsInstallCmd);

  // Referenced by tasks.json
  const getPathDelimiterCmd = vscode.commands.registerCommand(
    "fx-extension.get-path-delimiter",
    () => Correlator.run(getPathDelimiterHandler)
  );
  context.subscriptions.push(getPathDelimiterCmd);

  const getDotnetPathCmd = vscode.commands.registerCommand("fx-extension.get-dotnet-path", () =>
    Correlator.run(getDotnetPathHandler)
  );
  context.subscriptions.push(getDotnetPathCmd);

  const installAppInTeamsCmd = vscode.commands.registerCommand(
    "fx-extension.install-app-in-teams",
    () => Correlator.runWithId(getLocalDebugSessionId(), triggerV3MigrationHandler)
  );
  context.subscriptions.push(installAppInTeamsCmd);

  const openTutorial = vscode.commands.registerCommand("fx-extension.openTutorial", (...args) =>
    Correlator.run(openTutorialHandler, [TelemetryTriggerFrom.QuickPick, ...(args as unknown[])])
  );
  context.subscriptions.push(openTutorial);

  const preDebugCheckCmd = vscode.commands.registerCommand("fx-extension.pre-debug-check", () =>
    Correlator.runWithId(getLocalDebugSessionId(), triggerV3MigrationHandler)
  );
  context.subscriptions.push(preDebugCheckCmd);

  // localdebug session starts from environment checker
  const validateDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-dependencies",
    () => Correlator.runWithId(startLocalDebugSession(), triggerV3MigrationHandler)
  );
  context.subscriptions.push(validateDependenciesCmd);

  // localdebug session starts from prerequisites checker
  const validatePrerequisitesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-local-prerequisites",
    triggerV3MigrationHandler
  );
  context.subscriptions.push(validatePrerequisitesCmd);

  registerInCommandController(context, CommandKeys.SigninAzure, signinAzureCallback);
}

/**
 * Copilot Chat Participant
 */
function registerChatParticipant(context: vscode.ExtensionContext) {
  const participant = vscode.chat.createChatParticipant(chatParticipantId, (...args) =>
    Correlator.run(chatRequestHandler, ...args)
  );
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "teams.png");
  participant.followupProvider = followupProvider;
  participant.onDidReceiveFeedback((...args) => Correlator.run(handleFeedback, ...args));

  context.subscriptions.push(
    participant,
    vscode.commands.registerCommand(CHAT_EXECUTE_COMMAND_ID, chatExecuteCommandHandler),
    vscode.commands.registerCommand(CHAT_OPENURL_COMMAND_ID, openUrlCommandHandler)
  );

  const generateManifestGUID = vscode.commands.registerCommand(
    "fx-extension.generateManifestGUID",
    () => Correlator.run(officeDevHandlers.generateManifestGUID)
  );
  context.subscriptions.push(generateManifestGUID);
}

/**
 * Copilot Chat Participant for Office Add-in
 */
function registerOfficeChatParticipant(context: vscode.ExtensionContext) {
  const participant = vscode.chat.createChatParticipant(officeChatParticipantId, (...args) =>
    Correlator.run(officeChatRequestHandler, ...args)
  );
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "office.png");
  participant.followupProvider = followupProvider;
  participant.onDidReceiveFeedback((...args) => Correlator.run(handleOfficeFeedback, ...args));

  context.subscriptions.push(
    participant,
    vscode.commands.registerCommand("fx-extension.openOfficeDevDocument", (...args) =>
      Correlator.run(officeDevHandlers.openDocumentHandler, args)
    ),
    vscode.commands.registerCommand(
      CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
      chatCreateOfficeProjectCommandHandler
    )
  );
}

function registerTreeViewCommandsInDevelopment(context: vscode.ExtensionContext) {
  // Open adaptive card
  registerInCommandController(context, "fx-extension.OpenAdaptiveCardExt", installAdaptiveCardExt);

  registerInCommandController(context, "fx-extension.addWebpart", addWebpartHandler, "addWebpart");
}

function registerTreeViewCommandsInLifecycle(context: vscode.ExtensionContext) {
  // Provision in the cloud
  registerInCommandController(context, CommandKeys.Provision, provisionHandler, "provision");

  // Zip Teams metadata package
  registerInCommandController(context, "fx-extension.build", buildPackageHandler, "buildPackage");

  // Deploy to the cloud
  registerInCommandController(context, CommandKeys.Deploy, deployHandler, "deploy");

  // Publish to Teams
  registerInCommandController(context, CommandKeys.Publish, publishHandler, "publish");

  // Publish in Developer Portal
  registerInCommandController(
    context,
    "fx-extension.publishInDeveloperPortal",
    publishInDeveloperPortalHandler,
    "publishInDeveloperPortal"
  );

  // Developer Portal for Teams
  registerInCommandController(context, "fx-extension.openAppManagement", openAppManagement);
}

function registerTreeViewCommandsInHelper(context: vscode.ExtensionContext) {
  // Report issues on GitHub
  registerInCommandController(context, "fx-extension.openReportIssues", openReportIssues);
}

/**
 * TeamsFx related commands, they will show in command palette after extension is initialized
 */
function registerTeamsFxCommands(context: vscode.ExtensionContext) {
  const createNewEnvCmd = vscode.commands.registerCommand(
    // TODO: fix trigger from
    "fx-extension.addEnvironment",
    (...args) => Correlator.run(createNewEnvironment, args)
  );
  context.subscriptions.push(createNewEnvCmd);

  const updateAadAppManifest = vscode.commands.registerCommand(
    "fx-extension.updateAadAppManifest",
    (...args) => Correlator.run(updateAadAppManifestHandler, args)
  );
  context.subscriptions.push(updateAadAppManifest);

  const updateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.updatePreviewFile",
    (...args) => Correlator.run(updatePreviewManifest, args)
  );
  context.subscriptions.push(updateManifestCmd);

  const validateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.validateManifest",
    (...args) => Correlator.run(validateManifestHandler, args)
  );
  context.subscriptions.push(validateManifestCmd);

  const openBotManagementCmd = vscode.commands.registerCommand(
    "fx-extension.openBotManagement",
    (...args) => Correlator.run(openBotManagement, args)
  );
  context.subscriptions.push(openBotManagementCmd);

  const decryptCmd = vscode.commands.registerCommand(
    "fx-extension.decryptSecret",
    (cipher: string, selection) => Correlator.run(decryptSecret, cipher, selection)
  );
  context.subscriptions.push(decryptCmd);

  const openConfigStateCmd = vscode.commands.registerCommand(
    "fx-extension.openConfigState",
    (...args) => Correlator.run(openConfigStateFile, args)
  );
  context.subscriptions.push(openConfigStateCmd);

  const editAadManifestTemplateCmd = vscode.commands.registerCommand(
    "fx-extension.editAadManifestTemplate",
    (...args) => Correlator.run(editAadManifestTemplateHandler, args)
  );
  context.subscriptions.push(editAadManifestTemplateCmd);

  registerInCommandController(context, CommandKeys.Preview, treeViewPreviewHandler);

  registerInCommandController(context, "fx-extension.openFolder", openFolderHandler);

  const checkSideloading = vscode.commands.registerCommand(
    "fx-extension.checkSideloading",
    (...args) => Correlator.run(checkSideloadingCallback, args)
  );
  context.subscriptions.push(checkSideloading);

  const checkCopilotCallbackCmd = vscode.commands.registerCommand(
    "fx-extension.checkCopilotCallback",
    (...args) => Correlator.run(checkCopilotCallback, args)
  );
  context.subscriptions.push(checkCopilotCallbackCmd);
}

/**
 * Commands used in menus, e.g. Explorer context & view item title/context
 */
function registerMenuCommands(context: vscode.ExtensionContext) {
  const createNewEnvironmentWithIcon = vscode.commands.registerCommand(
    "fx-extension.addEnvironmentWithIcon",
    (...args) => Correlator.run(createNewEnvironment, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(createNewEnvironmentWithIcon);

  const azureAccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.azureAccountSettings",
    () => Correlator.run(openAzureAccountHandler)
  );
  context.subscriptions.push(azureAccountSettingsCmd);

  const createAccountCmd = vscode.commands.registerCommand(
    "fx-extension.createAccount",
    (...args) => Correlator.run(createAccountHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(createAccountCmd);

  const manageCollaborator = vscode.commands.registerCommand(
    "fx-extension.manageCollaborator",
    async (node: Record<string, string>) => {
      const envName = node.identifier;
      await Correlator.run(manageCollaboratorHandler, envName);
    }
  );
  context.subscriptions.push(manageCollaborator);

  registerInCommandController(context, CommandKeys.LocalDebug, treeViewLocalDebugHandler);

  registerInCommandController(
    context,
    "fx-extension.localdebugWithIcon",
    treeViewLocalDebugHandler
  );

  registerInCommandController(
    context,
    "fx-extension.debugInTestToolWithIcon",
    debugInTestToolHandler("treeview")
  );

  registerInCommandController(
    context,
    CommandKeys.DebugInTestToolFromMessage,
    debugInTestToolHandler("message")
  );

  const m365AccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.m365AccountSettings",
    () => Correlator.run(openM365AccountHandler)
  );
  context.subscriptions.push(m365AccountSettingsCmd);

  const openAccountLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openAccountLink",
    (...args) => Correlator.run(openAccountLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openAccountLinkCmd);

  const openLifecycleLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openLifecycleLink",
    (...args) =>
      Correlator.run(openLifecycleLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openLifecycleLinkCmd);

  const openDevelopmentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDevelopmentLink",
    (...args) =>
      Correlator.run(openDevelopmentLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openDevelopmentLinkCmd);

  const openEnvLinkCmd = vscode.commands.registerCommand("fx-extension.openEnvLink", (...args) =>
    Correlator.run(openEnvLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openEnvLinkCmd);

  const openHelpFeedbackLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openHelpFeedbackLink",
    (...args) =>
      Correlator.run(openHelpFeedbackLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openHelpFeedbackLinkCmd);

  const openDocumentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDocumentLink",
    (...args) => Correlator.run(openDocumentLinkHandler, args)
  );
  context.subscriptions.push(openDocumentLinkCmd);

  const azureAccountSignOutHelpCmd = vscode.commands.registerCommand(
    "fx-extension.azureAccountSignOutHelp",
    (...args) => Correlator.run(azureAccountSignOutHelpHandler, args)
  );
  context.subscriptions.push(azureAccountSignOutHelpCmd);

  const aadManifestTemplateCodeLensCmd = vscode.commands.registerCommand(
    "fx-extension.openPreviewAadFile",
    (...args) => Correlator.run(openPreviewAadFileHandler, args)
  );
  context.subscriptions.push(aadManifestTemplateCodeLensCmd);

  const openResourceGroupInPortalCmd = vscode.commands.registerCommand(
    "fx-extension.openResourceGroupInPortal",
    async (node: Record<string, string>) => {
      const envName = node.identifier;
      await Correlator.run(openResourceGroupInPortal, envName);
    }
  );
  context.subscriptions.push(openResourceGroupInPortalCmd);

  const openManifestSchemaCmd = vscode.commands.registerCommand(
    "fx-extension.openSchema",
    async (...args) => {
      await Correlator.run(openExternalHandler, args);
    }
  );
  context.subscriptions.push(openManifestSchemaCmd);

  const addAPICmd = vscode.commands.registerCommand(
    "fx-extension.copilotPluginAddAPI",
    async (...args) => {
      await Correlator.run(copilotPluginAddAPIHandler, args);
    }
  );
  context.subscriptions.push(addAPICmd);

  const openSubscriptionInPortalCmd = vscode.commands.registerCommand(
    "fx-extension.openSubscriptionInPortal",
    async (node: Record<string, string>) => {
      const envName = node.identifier;
      await Correlator.run(openSubscriptionInPortal, envName);
    }
  );
  context.subscriptions.push(openSubscriptionInPortalCmd);

  registerInCommandController(context, "fx-extension.previewWithIcon", treeViewPreviewHandler);

  const refreshEnvironmentH = vscode.commands.registerCommand(
    "fx-extension.refreshEnvironment",
    (...args) => Correlator.run(refreshEnvironment, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(refreshEnvironmentH);

  const refreshSideloading = vscode.commands.registerCommand(
    "fx-extension.refreshSideloading",
    (...args) => Correlator.run(refreshSideloadingCallback, args)
  );
  context.subscriptions.push(refreshSideloading);

  const refreshCopilot = vscode.commands.registerCommand("fx-extension.refreshCopilot", (...args) =>
    Correlator.run(refreshCopilotCallback, args)
  );
  context.subscriptions.push(refreshCopilot);
}

/**
 * Commands used in office dev tree view menus, e.g. Explorer context & view item title/context
 */
function registerOfficeDevMenuCommands(context: vscode.ExtensionContext) {
  // development
  const openDevelopmentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openOfficeDevDevelopmentLink",
    (...args) => Correlator.run(officeDevHandlers.openDevelopmentLinkHandler, args)
  );
  context.subscriptions.push(openDevelopmentLinkCmd);

  //fx-extension.create and fx-extension.openSamples are registered in registerActivateCommands
  const installDependencyCmd = vscode.commands.registerCommand(
    "fx-extension.installDependency",
    () => Correlator.run(officeDevHandlers.installOfficeAddInDependencies)
  );
  context.subscriptions.push(installDependencyCmd);

  registerInCommandController(context, CommandKeys.LocalDebug, treeViewLocalDebugHandler);

  const stopDebugging = vscode.commands.registerCommand("fx-extension.stopDebugging", () =>
    Correlator.run(officeDevHandlers.stopOfficeAddInDebug)
  );
  context.subscriptions.push(stopDebugging);

  // lifecycle
  const openLifecycleLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openOfficeDevLifecycleLink",
    (...args) => Correlator.run(officeDevHandlers.openLifecycleLinkHandler, args)
  );
  context.subscriptions.push(openLifecycleLinkCmd);

  const openDeployLinkCmd = vscode.commands.registerCommand(
    "fx-extension.officeDevDeploy",
    (...args) => Correlator.run(officeDevHandlers.openOfficeDevDeployHandler, args)
  );
  context.subscriptions.push(openDeployLinkCmd);

  const publishToAppSourceCmd = vscode.commands.registerCommand(
    "fx-extension.publishToAppSource",
    () => Correlator.run(officeDevHandlers.publishToAppSourceHandler)
  );
  context.subscriptions.push(publishToAppSourceCmd);

  // utility
  const validateManifest = vscode.commands.registerCommand(
    "fx-extension.validateApplication",
    (...args) => Correlator.run(officeDevHandlers.validateOfficeAddInManifest, args)
  );
  context.subscriptions.push(validateManifest);

  const openScriptLabLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openSciptLabLink",
    (...args) => Correlator.run(officeDevHandlers.openScriptLabLink, args)
  );
  context.subscriptions.push(openScriptLabLinkCmd);

  const openPromptLibraryLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openPromptLibraryLink",
    (...args) => Correlator.run(officeDevHandlers.openPromptLibraryLink, args)
  );
  context.subscriptions.push(openPromptLibraryLinkCmd);

  // help and feedback
  const openHelpFeedbackLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openOfficeDevHelpFeedbackLink",
    (...args) => Correlator.run(officeDevHandlers.openHelpFeedbackLinkHandler, args)
  );
  context.subscriptions.push(openHelpFeedbackLinkCmd);

  const openGetStartedLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openGetStarted",
    (...args) => Correlator.run(officeDevHandlers.openGetStartedLinkHandler, args)
  );
  context.subscriptions.push(openGetStartedLinkCmd);

  const openOfficePartnerCenterLinkCmd = vscode.commands.registerCommand(
    "fx-extension.officePartnerCenter",
    (...args) => Correlator.run(officeDevHandlers.openOfficePartnerCenterHandler, args)
  );
  context.subscriptions.push(openOfficePartnerCenterLinkCmd);

  const reportIssueCmd = vscode.commands.registerCommand(
    "fx-extension.openOfficeDevReportIssues",
    (...args) => Correlator.run(officeDevHandlers.openReportIssues, args)
  );
  context.subscriptions.push(reportIssueCmd);
}

function registerAccountMenuCommands(context: vscode.ExtensionContext) {
  // Register SignOut tree view command
  context.subscriptions.push(
    vscode.commands.registerCommand("fx-extension.signOut", async (node: TreeViewCommand) => {
      try {
        switch (node.contextValue) {
          case "signedinM365": {
            await Correlator.run(async () => {
              await signOutM365(true);
            });
            break;
          }
          case "signedinAzure": {
            await Correlator.run(async () => {
              await signOutAzure(true);
            });
            break;
          }
        }
      } catch (e) {
        void showError(e as FxError);
      }
    })
  );
}

async function initializeContextKey(context: vscode.ExtensionContext, isTeamsFxProject: boolean) {
  await vscode.commands.executeCommand("setContext", "fx-extension.isSPFx", isSPFxProject);

  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isM365",
    workspaceUri && (await isM365Project(workspaceUri.fsPath))
  );

  if (isTeamsFxProject) {
    const aadTemplateWatcher = vscode.workspace.createFileSystemWatcher("**/aad.template.json");

    aadTemplateWatcher.onDidCreate(async (event) => {
      await setAadManifestEnabledContext();
    });
  }

  const ymlFileWatcher = vscode.workspace.createFileSystemWatcher(
    "**/teamsapp.yml",
    false,
    true,
    true
  );
  ymlFileWatcher.onDidCreate(async (event) => {
    await detectedTeamsFxProject(context);
  });

  await setAadManifestEnabledContext();
  await setTDPIntegrationEnabledContext();

  const upgradeable = await checkProjectUpgradable();
  if (upgradeable) {
    await vscode.commands.executeCommand("setContext", "fx-extension.canUpgradeV3", true);
    await checkUpgrade([TelemetryTriggerFrom.Auto]);
  }
}

async function setAadManifestEnabledContext() {
  await vscode.commands.executeCommand("setContext", "fx-extension.isAadManifestEnabled", true);
}

async function setTDPIntegrationEnabledContext() {
  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isTDPIntegrationEnabled", // Currently it will return whether v3 is enabled or not.
    true
  );
}

function registerCodelensAndHoverProviders(context: vscode.ExtensionContext) {
  // Setup CodeLens provider for userdata file
  const codelensProvider = new CryptoCodeLensProvider();
  const envDataSelector = {
    scheme: "file",
    pattern: "**/.env.*",
  };

  const projectSettingsCodeLensProvider = new ProjectSettingsCodeLensProvider();
  const projectSettingsSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/.${ConfigFolderName}/configs/projectSettings.json`,
  };

  const manifestTemplateCodeLensProvider = new ManifestTemplateCodeLensProvider();
  const manifestTemplateSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${AppPackageFolderName}/manifest.json`,
  };
  const localManifestTemplateSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${AppPackageFolderName}/manifest.local.json`,
  };

  const manifestPreviewSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${BuildFolderName}/${AppPackageFolderName}/manifest.*.json`,
  };

  const smeOpenapiSpecSelector = {
    language: "yaml",
    scheme: "file",
    pattern: `**/${AppPackageFolderName}/apiSpecificationFile/*.{yml,yaml}`,
  };
  const apiPluginOpenapiSpecSelector: vscode.DocumentSelector = {
    scheme: "file",
    pattern: `**/${AppPackageFolderName}/apiSpecificationFile/*.{yml,yaml,json}`,
  };

  const aadAppTemplateCodeLensProvider = new AadAppTemplateCodeLensProvider();

  const aadAppTemplateSelectorV3 = {
    language: "json",
    scheme: "file",
    pattern: `**/aad.manifest.json`,
  };

  const permissionsJsonFileCodeLensProvider = new PermissionsJsonFileCodeLensProvider();
  const permissionsJsonFileSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/permissions.json`,
  };

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(envDataSelector, codelensProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      projectSettingsSelector,
      projectSettingsCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestTemplateSelector,
      manifestTemplateCodeLensProvider
    )
  );
  const copilotPluginCodeLensProvider = new CopilotPluginCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestTemplateSelector,
      copilotPluginCodeLensProvider
    )
  );

  const apiPluginCodeLensProvider = new ApiPluginCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      apiPluginOpenapiSpecSelector,
      apiPluginCodeLensProvider
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      localManifestTemplateSelector,
      manifestTemplateCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestPreviewSelector,
      manifestTemplateCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      smeOpenapiSpecSelector,
      manifestTemplateCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      permissionsJsonFileSelector,
      permissionsJsonFileCodeLensProvider
    )
  );

  const aadManifestPreviewSelectorV3 = {
    language: "json",
    scheme: "file",
    pattern: `**/${BuildFolderName}/aad.*.json`,
  };

  const manifestTemplateHoverProvider = new ManifestTemplateHoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(manifestTemplateSelector, manifestTemplateHoverProvider)
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      aadAppTemplateSelectorV3,
      aadAppTemplateCodeLensProvider
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      localManifestTemplateSelector,
      manifestTemplateHoverProvider
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(aadAppTemplateSelectorV3, manifestTemplateHoverProvider)
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      aadManifestPreviewSelectorV3,
      aadAppTemplateCodeLensProvider
    )
  );

  const yamlCodelensProvider = new TeamsAppYamlCodeLensProvider();
  const yamlFileSelector = {
    language: "yaml",
    scheme: "file",
    pattern: `**/teamsapp.yml`,
  };
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(yamlFileSelector, yamlCodelensProvider)
  );
}

function registerOfficeDevCodeLensProviders(context: vscode.ExtensionContext) {
  const officeDevManifestCodeLensProvider = new OfficeDevManifestCodeLensProvider();
  const manifestFileSelector = {
    language: "xml",
    scheme: "file",
    pattern: `**/manifest*.xml`,
  };
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestFileSelector,
      officeDevManifestCodeLensProvider
    )
  );
}

function registerDebugConfigProviders(context: vscode.ExtensionContext) {
  const debugProvider: TeamsfxDebugProvider = new TeamsfxDebugProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("pwa-chrome", debugProvider)
  );
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("chrome", debugProvider)
  );
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("pwa-msedge", debugProvider)
  );
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("msedge", debugProvider)
  );
}

/**
 * Tasks that doesn't block the user interaction so that they can be processed in background.
 */
async function runBackgroundAsyncTasks(
  context: vscode.ExtensionContext,
  isTeamsFxProject: boolean
) {
  await exp.initialize(context);
  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isNewUser",
    isExistingUser === "no"
  );
  TreatmentVariableValue.inProductDoc = await exp
    .getExpService()
    .getTreatmentVariableAsync(
      TreatmentVariables.VSCodeConfig,
      TreatmentVariables.InProductDoc,
      true
    );

  ExtTelemetry.settingsVersion = await getSettingsVersion();

  await ExtTelemetry.sendCachedTelemetryEventsAsync();
  const releaseNote = new ReleaseNote(context);
  await releaseNote.show();

  await openWelcomePageAfterExtensionInstallation();

  if (isTeamsFxProject) {
    await runTeamsFxBackgroundTasks();
  }

  if (isOfficeAddInProject) {
    await runOfficeDevBackgroundTasks();
  }

  const survey = ExtensionSurvey.getInstance();
  survey.activate();

  await recommendACPExtension();

  await checkProjectTypeAndSendTelemetry();
}

async function runTeamsFxBackgroundTasks() {
  const upgradeable = await checkProjectUpgradable();
  if (isTeamsFxProject) {
    await autoOpenProjectHandler();
    await TreeViewManagerInstance.updateTreeViewsByContent(upgradeable);
  }
}

async function runOfficeDevBackgroundTasks() {
  await officeDevHandlers.autoOpenOfficeDevProjectHandler();
}

function registerInCommandController(
  context: vscode.ExtensionContext,
  name: string,
  callback: (...args: unknown[]) => Promise<Result<unknown, FxError>>,
  runningLabelKey?: string
) {
  commandController.registerCommand(name, callback, runningLabelKey);
  const command = vscode.commands.registerCommand(name, (...args) => {
    if (args[1] === TelemetryTriggerFrom.CopilotChat) {
      return Correlator.runWithId(args[0], runCommand, name, ...args.slice(1));
    }
    return Correlator.run(runCommand, name, ...args);
  });
  context.subscriptions.push(command);
}

function runCommand(commandName: string, ...args: unknown[]) {
  return commandController.runCommand(commandName, ...args);
}

async function checkProjectUpgradable(): Promise<boolean> {
  const versionCheckResult = await projectVersionCheck();
  if (versionCheckResult.isErr()) {
    unsetIsTeamsFxProject();
    return false;
  }
  const upgradeable = versionCheckResult.isOk()
    ? versionCheckResult.value.isSupport == VersionState.upgradeable
    : false;
  return upgradeable;
}

async function detectedTeamsFxProject(context: vscode.ExtensionContext) {
  const wasTeamsFxProject = isTeamsFxProject;
  initializeGlobalVariables(context);
  if (isTeamsFxProject && !wasTeamsFxProject) {
    activateTeamsFxRegistration(context);

    await vscode.commands.executeCommand("setContext", "fx-extension.isTeamsFx", isTeamsFxProject);

    const aadTemplateWatcher = vscode.workspace.createFileSystemWatcher("**/aad.template.json");

    aadTemplateWatcher.onDidCreate(async (event) => {
      await setAadManifestEnabledContext();
    });

    void runTeamsFxBackgroundTasks();
  }

  const upgradeable = await checkProjectUpgradable();
  if (isTeamsFxProject) {
    await vscode.commands.executeCommand("setContext", "fx-extension.canUpgradeV3", upgradeable);
    await TreeViewManagerInstance.updateTreeViewsByContent(upgradeable);
  }
}

async function recommendACPExtension(): Promise<void> {
  if (!acpInstalled() && (await hasAdaptiveCardInWorkspace())) {
    await installAdaptiveCardExt(TelemetryTriggerFrom.Auto);
  }
}
