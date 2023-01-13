// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";

import {
  AdaptiveCardsFolderName,
  AppPackageFolderName,
  BuildFolderName,
  ConfigFolderName,
  FxError,
  InputConfigsFolderName,
  ProjectSettingsV3,
  ProjectSettingsFileName,
  Result,
  TemplateFolderName,
} from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import {
  AadAppTemplateCodeLensProvider,
  AdaptiveCardCodeLensProvider,
  CryptoCodeLensProvider,
  ManifestTemplateCodeLensProvider,
  PermissionsJsonFileCodeLensProvider,
  ProjectSettingsCodeLensProvider,
} from "./codeLensProvider";
import commandController from "./commandController";
import AzureAccountManager from "./commonlib/azureLogin";
import VsCodeLogInstance from "./commonlib/log";
import M365TokenInstance from "./commonlib/m365Login";
import { openWelcomePageAfterExtensionInstallation } from "./controls/openWelcomePage";
import { getLocalDebugSessionId, startLocalDebugSession } from "./debug/commonUtils";
import { localSettingsJsonName } from "./debug/constants";
import { showDebugChangesNotification } from "./debug/debugChangesNotification";
import { disableRunIcon, registerRunIcon } from "./debug/runIconHandler";
import { TeamsfxDebugProvider } from "./debug/teamsfxDebugProvider";
import { registerTeamsfxTaskAndDebugEvents } from "./debug/teamsfxTaskHandler";
import { TeamsfxTaskProvider } from "./debug/teamsfxTaskProvider";
import * as exp from "./exp";
import { TreatmentVariables, TreatmentVariableValue } from "./exp/treatmentVariables";
import {
  initializeGlobalVariables,
  isExistingUser,
  isSPFxProject,
  isTeamsFxProject,
  workspaceUri,
} from "./globalVariables";
import * as handlers from "./handlers";
import { ManifestTemplateHoverProvider } from "./hoverProvider";
import { VsCodeUI } from "./qm/vsc_ui";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "./telemetry/extTelemetryEvents";
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import {
  canUpgradeToArmAndMultiEnv,
  delay,
  isM365Project,
  syncFeatureFlags,
} from "./utils/commonUtils";
import { loadLocalizedStrings } from "./utils/localizeUtils";
import { ExtensionSurvey } from "./utils/survey";
import { ExtensionUpgrade } from "./utils/upgrade";
import { hasAAD } from "@microsoft/teamsfx-core/build/common/projectSettingsHelperV3";
import {
  AuthSvcScopes,
  isMigrationV3Enabled,
  setRegion,
} from "@microsoft/teamsfx-core/build/common/tools";
import { UriHandler } from "./uriHandler";
import { isV3Enabled, isTDPIntegrationEnabled } from "@microsoft/teamsfx-core";
import { VersionState } from "@microsoft/teamsfx-core/build/common/versionMetadata";

export let VS_CODE_UI: VsCodeUI;

export async function activate(context: vscode.ExtensionContext) {
  // load the feature flags.
  syncFeatureFlags();

  context.subscriptions.push(new ExtTelemetry.Reporter(context));

  VS_CODE_UI = new VsCodeUI(context);
  initializeGlobalVariables(context);
  loadLocalizedStrings();

  const uriHandler = new UriHandler();
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  registerActivateCommands(context);

  registerInternalCommands(context);

  if (isTeamsFxProject) {
    registerTreeViewCommandsInDevelopment(context);
    registerTreeViewCommandsInDeployment(context);
    registerTreeViewCommandsInHelper(context);
    registerTeamsFxCommands(context);
    registerMenuCommands(context);
    handlers.registerAccountMenuCommands(context);

    TreeViewManagerInstance.registerTreeViews(context);
    accountTreeViewProviderInstance.subscribeToStatusChanges({
      azureAccountProvider: AzureAccountManager,
      m365TokenProvider: M365TokenInstance,
    });
    // Set region for M365 account every
    M365TokenInstance.setStatusChangeMap(
      "set-region",
      { scopes: AuthSvcScopes },
      async (status, token, accountInfo) => {
        if (status === "SignedIn") {
          const tokenRes = await M365TokenInstance.getAccessToken({ scopes: AuthSvcScopes });
          if (tokenRes.isOk()) {
            setRegion(tokenRes.value);
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

    registerRunIcon();

    // Register teamsfx task provider
    const taskProvider: TeamsfxTaskProvider = new TeamsfxTaskProvider();
    context.subscriptions.push(
      vscode.tasks.registerTaskProvider(TeamsfxTaskProvider.type, taskProvider)
    );

    context.subscriptions.push(
      vscode.workspace.onWillSaveTextDocument(handlers.saveTextDocumentHandler)
    );
  }

  // Call activate function of toolkit core.
  handlers.activate();

  // Init VSC context key
  await initializeContextKey(isTeamsFxProject);

  // UI is ready to show & interact
  await vscode.commands.executeCommand("setContext", "fx-extension.isTeamsFx", isTeamsFxProject);
  await vscode.commands.executeCommand("setContext", "fx-extension.initialized", true);

  VsCodeLogInstance.info("Teams Toolkit extension is now active!");

  // Don't wait this async method to let it run in background.
  runBackgroundAsyncTasks(context, isTeamsFxProject);
}

// this method is called when your extension is deactivated
export async function deactivate() {
  await ExtTelemetry.cacheTelemetryEventAsync(TelemetryEvent.Deactivate);
  await ExtTelemetry.dispose();
  handlers.cmdHdlDisposeTreeView();
  disableRunIcon();
}

/**
 * Commands that always show in command palette. They will activate extension and wait for its completion.
 * They are usually used in welcome view and walkthrough.
 */
function registerActivateCommands(context: vscode.ExtensionContext) {
  // non-teamsfx project upgrade
  const checkUpgradeCmd = vscode.commands.registerCommand(
    "fx-extension.checkProjectUpgrade",
    (...args) => Correlator.run(handlers.checkUpgrade, args)
  );
  context.subscriptions.push(checkUpgradeCmd);

  // user can manage account in non-teamsfx project
  const cmpAccountsCmd = vscode.commands.registerCommand("fx-extension.cmpAccounts", (...args) =>
    Correlator.run(handlers.cmpAccountsHandler, args)
  );
  context.subscriptions.push(cmpAccountsCmd);

  // Create a new Teams app
  registerInCommandController(
    context,
    "fx-extension.create",
    handlers.createNewProjectHandler,
    "createProject"
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("fx-extension.createFromWalkthrough", async (...args) => {
      const targetUri = await Correlator.run(handlers.createProjectFromWalkthroughHandler, args);
      if (targetUri.isOk()) {
        await handlers.updateAutoOpenGlobalKey(true, false, targetUri.value, args);
        await ExtTelemetry.dispose();
        await delay(2000);
        return { openFolder: targetUri.value };
      }
    })
  );

  // Show deployment view
  const openDeploymentTreeview = vscode.commands.registerCommand(
    "fx-extension.openDeploymentTreeview",
    (...args) => Correlator.run(handlers.openDeploymentTreeview, args)
  );
  context.subscriptions.push(openDeploymentTreeview);

  // Documentation
  registerInCommandController(context, "fx-extension.openDocument", handlers.openDocumentHandler);

  // README
  const openReadMeCmd = vscode.commands.registerCommand("fx-extension.openReadMe", (...args) =>
    Correlator.run(handlers.openReadMeHandler, args)
  );
  context.subscriptions.push(openReadMeCmd);

  // View samples
  registerInCommandController(context, "fx-extension.openSamples", handlers.openSamplesHandler);

  // Quick start
  registerInCommandController(context, "fx-extension.openWelcome", handlers.openWelcomeHandler);

  // Tutorials
  registerInCommandController(
    context,
    "fx-extension.selectTutorials",
    handlers.selectTutorialsHandler
  );

  const signinM365 = vscode.commands.registerCommand("fx-extension.signinM365", (...args) =>
    Correlator.run(handlers.signinM365Callback, args)
  );
  context.subscriptions.push(signinM365);

  // Prerequisites check
  const validateGetStartedPrerequisitesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-getStarted-prerequisites",
    (...args) => Correlator.run(handlers.validateGetStartedPrerequisitesHandler, args)
  );
  context.subscriptions.push(validateGetStartedPrerequisitesCmd);
}

/**
 * Internal commands that will not show in command palette and only be called via executeCommand()
 */
function registerInternalCommands(context: vscode.ExtensionContext) {
  registerInCommandController(
    context,
    "fx-extension.openFromTdp",
    handlers.scaffoldFromDeveloperPortalHandler,
    "openFromTdp"
  );

  const showOutputChannel = vscode.commands.registerCommand(
    "fx-extension.showOutputChannel",
    (...args) => Correlator.run(handlers.showOutputChannel, args)
  );
  context.subscriptions.push(showOutputChannel);

  // Register backend extensions install command
  const backendExtensionsInstallCmd = vscode.commands.registerCommand(
    "fx-extension.backend-extensions-install",
    () => Correlator.runWithId(getLocalDebugSessionId(), handlers.backendExtensionsInstallHandler)
  );
  context.subscriptions.push(backendExtensionsInstallCmd);

  // Referenced by tasks.json
  const getFuncPathCmd = vscode.commands.registerCommand("fx-extension.get-func-path", () =>
    Correlator.run(handlers.getFuncPathHandler)
  );
  context.subscriptions.push(getFuncPathCmd);

  const getDotnetPathCmd = vscode.commands.registerCommand("fx-extension.get-dotnet-path", () =>
    Correlator.run(handlers.getDotnetPathHandler)
  );
  context.subscriptions.push(getDotnetPathCmd);

  const installAppInTeamsCmd = vscode.commands.registerCommand(
    "fx-extension.install-app-in-teams",
    () => Correlator.runWithId(getLocalDebugSessionId(), handlers.installAppInTeams)
  );
  context.subscriptions.push(installAppInTeamsCmd);

  const openSurveyCmd = vscode.commands.registerCommand("fx-extension.openSurvey", (...args) =>
    Correlator.run(handlers.openSurveyHandler, args)
  );
  context.subscriptions.push(openSurveyCmd);

  const openTutorial = vscode.commands.registerCommand("fx-extension.openTutorial", (...args) =>
    Correlator.run(handlers.openTutorialHandler, [TelemetryTriggerFrom.QuickPick, ...args])
  );
  context.subscriptions.push(openTutorial);

  const preDebugCheckCmd = vscode.commands.registerCommand("fx-extension.pre-debug-check", () =>
    Correlator.runWithId(getLocalDebugSessionId(), handlers.preDebugCheckHandler)
  );
  context.subscriptions.push(preDebugCheckCmd);

  // localdebug session starts from environment checker
  const validateDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-dependencies",
    () => Correlator.runWithId(startLocalDebugSession(), handlers.validateAzureDependenciesHandler)
  );
  context.subscriptions.push(validateDependenciesCmd);

  // localdebug session starts from prerequisites checker
  const validatePrerequisitesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-local-prerequisites",
    // Do not run with Correlator because it is handled inside `validateLocalPrerequisitesHandler()`.
    handlers.validateLocalPrerequisitesHandler
  );
  context.subscriptions.push(validatePrerequisitesCmd);

  // localdebug session starts from environment checker
  const validateSpfxDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-spfx-dependencies",
    () => Correlator.runWithId(startLocalDebugSession(), handlers.validateSpfxDependenciesHandler)
  );
  context.subscriptions.push(validateSpfxDependenciesCmd);

  const signinAzure = vscode.commands.registerCommand("fx-extension.signinAzure", (...args) =>
    Correlator.run(handlers.signinAzureCallback, args)
  );
  context.subscriptions.push(signinAzure);
}

function registerTreeViewCommandsInDevelopment(context: vscode.ExtensionContext) {
  // Initialize an existing application
  registerInCommandController(
    context,
    "fx-extension.init",
    handlers.initProjectHandler,
    "initProject"
  );

  // User can click to debug directly, same as pressing "F5".
  registerInCommandController(context, "fx-extension.debug", handlers.debugHandler);

  if (!isV3Enabled()) {
    // Add features
    registerInCommandController(
      context,
      "fx-extension.addFeature",
      handlers.addFeatureHandler,
      "addFeature"
    );
    // Edit manifest file
    registerInCommandController(
      context,
      "fx-extension.openManifest",
      handlers.openManifestHandler,
      "manifestEditor"
    );
  }

  // Open adaptive card
  registerInCommandController(
    context,
    "fx-extension.OpenAdaptiveCardExt",
    handlers.openAdaptiveCardExt
  );
}

function registerTreeViewCommandsInDeployment(context: vscode.ExtensionContext) {
  // Provision in the cloud
  registerInCommandController(
    context,
    "fx-extension.provision",
    handlers.provisionHandler,
    "provision"
  );

  // Zip Teams metadata package
  registerInCommandController(
    context,
    "fx-extension.build",
    handlers.buildPackageHandler,
    "buildPackage"
  );

  // Deploy to the cloud
  registerInCommandController(context, "fx-extension.deploy", handlers.deployHandler, "deploy");

  // Publish to Teams
  registerInCommandController(context, "fx-extension.publish", handlers.publishHandler, "publish");

  // Publish in Developer Portal
  registerInCommandController(
    context,
    "fx-extension.publishInDeveloperPortal",
    handlers.publishInDeveloperPortalHandler,
    "publishInDeveloperPortal"
  );

  // Developer Portal for Teams
  registerInCommandController(
    context,
    "fx-extension.openAppManagement",
    handlers.openAppManagement
  );
}

function registerTreeViewCommandsInHelper(context: vscode.ExtensionContext) {
  // Report issues on GitHub
  registerInCommandController(context, "fx-extension.openReportIssues", handlers.openReportIssues);
}

/**
 * TeamsFx related commands, they will show in command palette after extension is initialized
 */
function registerTeamsFxCommands(context: vscode.ExtensionContext) {
  const createNewEnvironment = vscode.commands.registerCommand(
    // TODO: fix trigger from
    "fx-extension.addEnvironment",
    (...args) => Correlator.run(handlers.createNewEnvironment, args)
  );
  context.subscriptions.push(createNewEnvironment);

  const updateAadAppManifest = vscode.commands.registerCommand(
    "fx-extension.updateAadAppManifest",
    (...args) => Correlator.run(handlers.updateAadAppManifest, args)
  );
  context.subscriptions.push(updateAadAppManifest);

  const migrateTeamsManifestCmd = vscode.commands.registerCommand(
    "fx-extension.migrateTeamsManifest",
    () => Correlator.run(handlers.migrateTeamsManifestHandler)
  );
  context.subscriptions.push(migrateTeamsManifestCmd);

  const migrateTeamsTabAppCmd = vscode.commands.registerCommand(
    "fx-extension.migrateTeamsTabApp",
    () => Correlator.run(handlers.migrateTeamsTabAppHandler)
  );
  context.subscriptions.push(migrateTeamsTabAppCmd);

  const updateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.updatePreviewFile",
    (...args) => Correlator.run(handlers.updatePreviewManifest, args)
  );
  context.subscriptions.push(updateManifestCmd);

  const validateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.validateManifest",
    (...args) => Correlator.run(handlers.validateManifestHandler, args)
  );
  context.subscriptions.push(validateManifestCmd);

  const openBotManagementCmd = vscode.commands.registerCommand(
    "fx-extension.openBotManagement",
    (...args) => Correlator.run(handlers.openBotManagement, args)
  );
  context.subscriptions.push(openBotManagementCmd);

  const decryptCmd = vscode.commands.registerCommand(
    "fx-extension.decryptSecret",
    (cipher, selection) => Correlator.run(handlers.decryptSecret, cipher, selection)
  );
  context.subscriptions.push(decryptCmd);

  const openConfigStateCmd = vscode.commands.registerCommand(
    "fx-extension.openConfigState",
    (...args) => Correlator.run(handlers.openConfigStateFile, args)
  );
  context.subscriptions.push(openConfigStateCmd);

  const editManifestTemplateCmd = vscode.commands.registerCommand(
    "fx-extension.editManifestTemplate",
    (...args) => Correlator.run(handlers.editManifestTemplate, args)
  );
  context.subscriptions.push(editManifestTemplateCmd);

  const editAadManifestTemplateCmd = vscode.commands.registerCommand(
    "fx-extension.editAadManifestTemplate",
    (...args) => Correlator.run(handlers.editAadManifestTemplate, args)
  );
  context.subscriptions.push(editAadManifestTemplateCmd);

  const preview = vscode.commands.registerCommand("fx-extension.preview", async (node) => {
    await Correlator.run(handlers.treeViewPreviewHandler, node.identifier);
  });
  context.subscriptions.push(preview);

  registerInCommandController(context, "fx-extension.openFolder", handlers.openFolderHandler);

  const checkSideloading = vscode.commands.registerCommand(
    "fx-extension.checkSideloading",
    (...args) => Correlator.run(handlers.checkSideloadingCallback, args)
  );
  context.subscriptions.push(checkSideloading);
}

/**
 * Commands used in menus, e.g. Explorer context & view item title/context
 */
function registerMenuCommands(context: vscode.ExtensionContext) {
  const createNewEnvironmentWithIcon = vscode.commands.registerCommand(
    "fx-extension.addEnvironmentWithIcon",
    (...args) =>
      Correlator.run(handlers.createNewEnvironment, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(createNewEnvironmentWithIcon);

  const azureAccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.azureAccountSettings",
    () => Correlator.run(handlers.openAzureAccountHandler)
  );
  context.subscriptions.push(azureAccountSettingsCmd);

  const createAccountCmd = vscode.commands.registerCommand(
    "fx-extension.createAccount",
    (...args) =>
      Correlator.run(handlers.createAccountHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(createAccountCmd);

  const updateAadAppManifestFromCtxMenu = vscode.commands.registerCommand(
    "fx-extension.updateAadAppManifestFromCtxMenu",
    (...args) => Correlator.run(handlers.updateAadAppManifest, args)
  );
  context.subscriptions.push(updateAadAppManifestFromCtxMenu);

  const deployManifestFromCtxMenuCmd = vscode.commands.registerCommand(
    "fx-extension.deployManifestFromCtxMenu",
    (...args) => Correlator.run(handlers.updatePreviewManifest, args)
  );
  context.subscriptions.push(deployManifestFromCtxMenuCmd);

  if (isV3Enabled()) {
    registerInCommandController(
      context,
      "fx-extension.manageCollaborator",
      handlers.manageCollaboratorHandler,
      "manageCollaborator"
    );
  } else {
    const grantPermission = vscode.commands.registerCommand(
      "fx-extension.grantPermission",
      (node) => {
        const envName = node.identifier;
        Correlator.run(handlers.grantPermission, envName);
      }
    );
    context.subscriptions.push(grantPermission);

    const listCollaborator = vscode.commands.registerCommand(
      "fx-extension.listCollaborator",
      (node) => {
        const envName = node.identifier;
        Correlator.run(handlers.listCollaborator, envName);
      }
    );
    context.subscriptions.push(listCollaborator);
  }

  const localDebug = vscode.commands.registerCommand("fx-extension.localdebug", (node) => {
    Correlator.run(handlers.treeViewLocalDebugHandler);
  });
  context.subscriptions.push(localDebug);

  const localDebugWithIcon = vscode.commands.registerCommand(
    "fx-extension.localdebugWithIcon",
    (node) => {
      Correlator.run(handlers.treeViewLocalDebugHandler);
    }
  );
  context.subscriptions.push(localDebugWithIcon);

  const m365AccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.m365AccountSettings",
    () => Correlator.run(handlers.openM365AccountHandler)
  );
  context.subscriptions.push(m365AccountSettingsCmd);

  const openAccountLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openAccountLink",
    (...args) =>
      Correlator.run(handlers.openAccountLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openAccountLinkCmd);

  const openDeploymentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDeploymentLink",
    (...args) =>
      Correlator.run(handlers.openDeploymentLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openDeploymentLinkCmd);

  const openDevelopmentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDevelopmentLink",
    (...args) =>
      Correlator.run(handlers.openDevelopmentLinkHandler, [
        TelemetryTriggerFrom.ViewTitleNavigation,
      ])
  );
  context.subscriptions.push(openDevelopmentLinkCmd);

  const openEnvLinkCmd = vscode.commands.registerCommand("fx-extension.openEnvLink", (...args) =>
    Correlator.run(handlers.openEnvLinkHandler, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(openEnvLinkCmd);

  const openHelpFeedbackLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openHelpFeedbackLink",
    (...args) =>
      Correlator.run(handlers.openHelpFeedbackLinkHandler, [
        TelemetryTriggerFrom.ViewTitleNavigation,
      ])
  );
  context.subscriptions.push(openHelpFeedbackLinkCmd);

  const openDocumentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDocumentLink",
    (...args) => Correlator.run(handlers.openDocumentLinkHandler, args)
  );
  context.subscriptions.push(openDocumentLinkCmd);

  const aadManifestTemplateCodeLensCmd = vscode.commands.registerCommand(
    "fx-extension.openPreviewAadFile",
    (...args) => Correlator.run(handlers.openPreviewAadFile, args)
  );
  context.subscriptions.push(aadManifestTemplateCodeLensCmd);

  const manifestTemplateCodeLensCmd = vscode.commands.registerCommand(
    "fx-extension.openPreviewFile",
    (...args) => Correlator.run(handlers.openPreviewManifest, args)
  );
  context.subscriptions.push(manifestTemplateCodeLensCmd);

  const openResourceGroupInPortal = vscode.commands.registerCommand(
    "fx-extension.openResourceGroupInPortal",
    (node) => {
      const envName = node.identifier;
      Correlator.run(handlers.openResourceGroupInPortal, envName);
    }
  );
  context.subscriptions.push(openResourceGroupInPortal);

  const openManifestSchemaCmd = vscode.commands.registerCommand(
    "fx-extension.openSchema",
    (...args) => {
      Correlator.run(handlers.openExternalHandler, args);
    }
  );
  context.subscriptions.push(openManifestSchemaCmd);

  const openSubscriptionInPortal = vscode.commands.registerCommand(
    "fx-extension.openSubscriptionInPortal",
    (node) => {
      const envName = node.identifier;
      Correlator.run(handlers.openSubscriptionInPortal, envName);
    }
  );
  context.subscriptions.push(openSubscriptionInPortal);

  const previewWithIcon = vscode.commands.registerCommand(
    "fx-extension.previewWithIcon",
    async (node) => {
      await Correlator.run(handlers.treeViewPreviewHandler, node.identifier);
    }
  );
  context.subscriptions.push(previewWithIcon);

  const refreshEnvironment = vscode.commands.registerCommand(
    "fx-extension.refreshEnvironment",
    (...args) =>
      Correlator.run(handlers.refreshEnvironment, [TelemetryTriggerFrom.ViewTitleNavigation])
  );
  context.subscriptions.push(refreshEnvironment);

  const refreshSideloading = vscode.commands.registerCommand(
    "fx-extension.refreshSideloading",
    (...args) => Correlator.run(handlers.refreshSideloadingCallback, args)
  );
  context.subscriptions.push(refreshSideloading);

  // Register local debug run icon
  const runIconCmd = vscode.commands.registerCommand("fx-extension.selectAndDebug", (...args) =>
    Correlator.run(handlers.selectAndDebugHandler, args)
  );
  context.subscriptions.push(runIconCmd);

  const specifySubscription = vscode.commands.registerCommand(
    "fx-extension.specifySubscription",
    (...args) => Correlator.run(handlers.selectSubscriptionCallback, args)
  );
  context.subscriptions.push(specifySubscription);
}

async function initializeContextKey(isTeamsFxProject: boolean) {
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

  await setAadManifestEnabledContext();
  await setApiV3EnabledContext();
  await setTDPIntegrationEnabledContext();

  if (isV3Enabled()) {
    if (isMigrationV3Enabled()) {
      const versionCheckResult = await handlers.projectVersionCheck();
      const upgradeable = versionCheckResult.isOk()
        ? versionCheckResult.value.isSupport == VersionState.upgradeable
        : false;
      if (upgradeable) {
        await handlers.checkUpgrade();
      }
      await vscode.commands.executeCommand("setContext", "fx-extension.canUpgradeV3", upgradeable);
    }
  } else {
    await vscode.commands.executeCommand(
      "setContext",
      "fx-extension.canUpgradeToArmAndMultiEnv",
      await canUpgradeToArmAndMultiEnv(workspaceUri?.fsPath)
    );
  }
}

async function setAadManifestEnabledContext() {
  if (isV3Enabled()) {
    vscode.commands.executeCommand("setContext", "fx-extension.isAadManifestEnabled", true);
  } else {
    const projectSettingsConfig = await handlers.getAzureProjectConfigV3();
    vscode.commands.executeCommand(
      "setContext",
      "fx-extension.isAadManifestEnabled",
      projectSettingsConfig
        ? hasAAD(projectSettingsConfig.projectSettings as ProjectSettingsV3)
        : false
    );
  }
}

async function setApiV3EnabledContext() {
  await vscode.commands.executeCommand("setContext", "fx-extension.isV3Enabled", isV3Enabled());
}

async function setTDPIntegrationEnabledContext() {
  await vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isTDPIntegrationEnabled", // Currently it will return whether v3 is enabled or not.
    isTDPIntegrationEnabled()
  );
}

function registerCodelensAndHoverProviders(context: vscode.ExtensionContext) {
  // Setup CodeLens provider for userdata file
  const codelensProvider = new CryptoCodeLensProvider();
  const userDataSelector = {
    language: "plaintext",
    scheme: "file",
    pattern: "**/*.userdata",
  };
  const localDebugDataSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/.${ConfigFolderName}/${InputConfigsFolderName}/${localSettingsJsonName}`,
  };
  const envDataSelector = {
    scheme: "file",
    pattern: "**/.env.*",
  };

  const adaptiveCardCodeLensProvider = new AdaptiveCardCodeLensProvider();
  const adaptiveCardFilePattern = `**/${AdaptiveCardsFolderName}/*.json`;
  const adaptiveCardFileSelector = {
    language: "json",
    scheme: "file",
    pattern: adaptiveCardFilePattern,
  };

  const projectSettingsCodeLensProvider = new ProjectSettingsCodeLensProvider();
  const projectSettingsSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/.${ConfigFolderName}/${InputConfigsFolderName}/${ProjectSettingsFileName}`,
  };

  const manifestTemplateCodeLensProvider = new ManifestTemplateCodeLensProvider();
  const manifestTemplateSelector = {
    language: "json",
    scheme: "file",
    pattern: isV3Enabled()
      ? `**/${AppPackageFolderName}/manifest.template.json`
      : `**/${TemplateFolderName}/${AppPackageFolderName}/manifest.template.json`,
  };
  const localManifestTemplateSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${AppPackageFolderName}/manifest.template.local.json`,
  };

  const manifestPreviewSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${BuildFolderName}/${AppPackageFolderName}/manifest.*.json`,
  };

  const aadAppTemplateCodeLensProvider = new AadAppTemplateCodeLensProvider();
  const aadAppTemplateSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${TemplateFolderName}/${AppPackageFolderName}/aad.template.json`,
  };

  const aadAppTemplateSelectorV3 = {
    language: "json",
    scheme: "file",
    pattern: `**/aad.manifest.template.json`,
  };

  const permissionsJsonFileCodeLensProvider = new PermissionsJsonFileCodeLensProvider();
  const permissionsJsonFileSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/permissions.json`,
  };

  if (isV3Enabled()) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(envDataSelector, codelensProvider)
    );
  } else {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(userDataSelector, codelensProvider)
    );
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(localDebugDataSelector, codelensProvider)
    );
  }
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      adaptiveCardFileSelector,
      adaptiveCardCodeLensProvider
    )
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
  if (isV3Enabled()) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        localManifestTemplateSelector,
        manifestTemplateCodeLensProvider
      )
    );
  }
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestPreviewSelector,
      manifestTemplateCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      permissionsJsonFileSelector,
      permissionsJsonFileCodeLensProvider
    )
  );

  // Register hover provider
  const aadManifestPreviewSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${BuildFolderName}/${AppPackageFolderName}/aad.*.json`,
  };

  const aadManifestPreviewSelectorV3 = {
    language: "json",
    scheme: "file",
    pattern: `**/${BuildFolderName}/aad.*.json`,
  };

  const manifestTemplateHoverProvider = new ManifestTemplateHoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(manifestTemplateSelector, manifestTemplateHoverProvider)
  );

  if (isV3Enabled()) {
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
      vscode.languages.registerHoverProvider(
        aadAppTemplateSelectorV3,
        manifestTemplateHoverProvider
      )
    );

    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        aadManifestPreviewSelectorV3,
        aadAppTemplateCodeLensProvider
      )
    );
  } else {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        aadAppTemplateSelector,
        aadAppTemplateCodeLensProvider
      )
    );

    context.subscriptions.push(
      vscode.languages.registerHoverProvider(aadAppTemplateSelector, manifestTemplateHoverProvider)
    );

    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        aadManifestPreviewSelector,
        aadAppTemplateCodeLensProvider
      )
    );
  }
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
  TreatmentVariableValue.inProductDoc = (await exp
    .getExpService()
    .getTreatmentVariableAsync(
      TreatmentVariables.VSCodeConfig,
      TreatmentVariables.InProductDoc,
      true
    )) as boolean | undefined;

  ExtTelemetry.isFromSample = await handlers.getIsFromSample();
  ExtTelemetry.settingsVersion = await handlers.getSettingsVersion();
  ExtTelemetry.isM365 = await handlers.getIsM365();

  await ExtTelemetry.sendCachedTelemetryEventsAsync();
  await handlers.postUpgrade();
  const upgrade = new ExtensionUpgrade(context);
  upgrade.showChangeLog();

  await openWelcomePageAfterExtensionInstallation();

  if (isTeamsFxProject) {
    await handlers.autoOpenProjectHandler();
    await handlers.promptSPFxUpgrade();
    await TreeViewManagerInstance.updateTreeViewsByContent();
    await AzureAccountManager.updateSubscriptionInfo();
  }

  const survey = ExtensionSurvey.getInstance();
  survey.activate();

  TreatmentVariableValue.taskOrientedTemplateNaming = (await exp
    .getExpService()
    .getTreatmentVariableAsync(
      TreatmentVariables.VSCodeConfig,
      TreatmentVariables.TaskOrientedTemplateNaming,
      true
    )) as boolean | undefined;

  await showDebugChangesNotification();
}

function registerInCommandController(
  context: vscode.ExtensionContext,
  name: string,
  callback: (args?: unknown[]) => Promise<Result<unknown, FxError>>,
  runningLabelKey?: string
) {
  commandController.registerCommand(name, callback, runningLabelKey);
  const command = vscode.commands.registerCommand(name, (...args) =>
    Correlator.run(runCommand, name, args)
  );
  context.subscriptions.push(command);
}

function runCommand(commandName: string, args: unknown[]) {
  commandController.runCommand(commandName, args);
}
