// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";
import { ext, initializeExtensionVariables } from "./extensionVariables";
import * as handlers from "./handlers";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import { registerTeamsfxTaskAndDebugEvents } from "./debug/teamsfxTaskHandler";
import { TeamsfxTaskProvider } from "./debug/teamsfxTaskProvider";
import { TeamsfxDebugProvider } from "./debug/teamsfxDebugProvider";
import { ExtensionSurvey } from "./utils/survey";
import VsCodeLogInstance from "./commonlib/log";
import * as StringResources from "./resources/Strings.json";
import { openWelcomePageAfterExtensionInstallation } from "./controls/openWelcomePage";
import { VsCodeUI } from "./qm/vsc_ui";
import { exp } from "./exp";
import { disableRunIcon, registerRunIcon } from "./debug/runIconHandler";
import {
  AdaptiveCardCodeLensProvider,
  CryptoCodeLensProvider,
  ManifestTemplateCodeLensProvider,
} from "./codeLensProvider";
import {
  Correlator,
  isMultiEnvEnabled,
  isRemoteCollaborateEnabled,
  isValidProject,
} from "@microsoft/teamsfx-core";
import { TreatmentVariableValue, TreatmentVariables } from "./exp/treatmentVariables";
import { enableMigrateV1 } from "./utils/migrateV1";
import {
  canUpgradeToArmAndMultiEnv,
  isSPFxProject,
  isTeamsfx,
  syncFeatureFlags,
  isValidNode,
} from "./utils/commonUtils";
import {
  ConfigFolderName,
  InputConfigsFolderName,
  StatesFolderName,
  AdaptiveCardsFolderName,
  AppPackageFolderName,
  BuildFolderName,
} from "@microsoft/teamsfx-api";
import { ExtensionUpgrade } from "./utils/upgrade";
import { registerEnvTreeHandler } from "./envTree";
import { getWorkspacePath } from "./handlers";
import { localSettingsJsonName } from "./debug/constants";
import { getLocalDebugSessionId, startLocalDebugSession } from "./debug/commonUtils";

export let VS_CODE_UI: VsCodeUI;

export async function activate(context: vscode.ExtensionContext) {
  VsCodeLogInstance.info(StringResources.vsc.extension.activate);

  // load the feature flags.
  syncFeatureFlags();

  // Init VSC context key
  initializeContextKey();

  VS_CODE_UI = new VsCodeUI(context);
  // Init context
  initializeExtensionVariables(context);

  context.subscriptions.push(new ExtTelemetry.Reporter(context));

  // activate upgrade
  const upgrade = new ExtensionUpgrade(context);
  upgrade.showChangeLog();

  await exp.initialize(context);
  TreatmentVariableValue.isEmbeddedSurvey = (await exp
    .getExpService()
    .getTreatmentVariableAsync(
      TreatmentVariables.VSCodeConfig,
      TreatmentVariables.EmbeddedSurvey,
      true
    )) as boolean | undefined;

  // 1.1 Register the creating command.
  const createCmd = vscode.commands.registerCommand("fx-extension.create", (...args) =>
    Correlator.run(handlers.createNewProjectHandler, args)
  );
  context.subscriptions.push(createCmd);

  const updateCmd = vscode.commands.registerCommand("fx-extension.update", (...args) =>
    Correlator.run(handlers.addResourceHandler, args)
  );
  context.subscriptions.push(updateCmd);

  // add capability
  const addCapCmd = vscode.commands.registerCommand("fx-extension.addCapability", (...args) =>
    Correlator.run(handlers.addCapabilityHandler, args)
  );
  context.subscriptions.push(addCapCmd);

  // 1.3 Register the provision command.
  const provisionCmd = vscode.commands.registerCommand("fx-extension.provision", (...args) =>
    Correlator.run(handlers.provisionHandler, args)
  );
  context.subscriptions.push(provisionCmd);

  // 1.5 Register the deploy command.
  const deployCmd = vscode.commands.registerCommand("fx-extension.deploy", (...args) =>
    Correlator.run(handlers.deployHandler, args)
  );
  context.subscriptions.push(deployCmd);

  const validateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.validateManifest",
    (...args) => Correlator.run(handlers.validateManifestHandler, args)
  );
  context.subscriptions.push(validateManifestCmd);

  const buildPackageCmd = vscode.commands.registerCommand("fx-extension.build", (...args) =>
    Correlator.run(handlers.buildPackageHandler, args)
  );
  context.subscriptions.push(buildPackageCmd);

  const publishCmd = vscode.commands.registerCommand("fx-extension.publish", (...args) =>
    Correlator.run(handlers.publishHandler, args)
  );
  context.subscriptions.push(publishCmd);

  const cicdGuideCmd = vscode.commands.registerCommand("fx-extension.cicdGuide", (...args) =>
    Correlator.run(handlers.cicdGuideHandler, args)
  );
  context.subscriptions.push(cicdGuideCmd);

  // 1.7 validate dependencies command (hide from UI)
  // localdebug session starts from environment checker
  const validateDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-dependencies",
    () => Correlator.runWithId(startLocalDebugSession(), handlers.validateDependenciesHandler)
  );
  context.subscriptions.push(validateDependenciesCmd);

  // localdebug session starts from environment checker
  const validateSpfxDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-spfx-dependencies",
    () => Correlator.runWithId(startLocalDebugSession(), handlers.validateSpfxDependenciesHandler)
  );
  context.subscriptions.push(validateSpfxDependenciesCmd);

  // localdebug session starts from prerequisites checker
  const validatePrerequisitesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-local-prerequisites",
    () => Correlator.runWithId(startLocalDebugSession(), handlers.validateLocalPrerequisitesHandler)
  );
  context.subscriptions.push(validatePrerequisitesCmd);

  // 1.8 pre debug check command (hide from UI)
  const preDebugCheckCmd = vscode.commands.registerCommand("fx-extension.pre-debug-check", () =>
    Correlator.runWithId(getLocalDebugSessionId(), handlers.preDebugCheckHandler)
  );
  context.subscriptions.push(preDebugCheckCmd);

  // 1.9 Register backend extensions install command (hide from UI)
  const backendExtensionsInstallCmd = vscode.commands.registerCommand(
    "fx-extension.backend-extensions-install",
    () => Correlator.runWithId(getLocalDebugSessionId(), handlers.backendExtensionsInstallHandler)
  );
  context.subscriptions.push(backendExtensionsInstallCmd);

  // 1.10 Register teamsfx task provider
  const taskProvider: TeamsfxTaskProvider = new TeamsfxTaskProvider();
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(TeamsfxTaskProvider.type, taskProvider)
  );

  const openWelcomeCmd = vscode.commands.registerCommand("fx-extension.openWelcome", (...args) =>
    Correlator.run(handlers.openWelcomeHandler, args)
  );
  context.subscriptions.push(openWelcomeCmd);

  const checkUpgradeCmd = vscode.commands.registerCommand(
    "fx-extension.checkProjectUpgrade",
    (...args) => Correlator.run(handlers.checkUpgrade, args)
  );
  context.subscriptions.push(checkUpgradeCmd);

  const openSurveyCmd = vscode.commands.registerCommand("fx-extension.openSurvey", (...args) =>
    Correlator.run(handlers.openSurveyHandler, args)
  );
  context.subscriptions.push(openSurveyCmd);

  const openSamplesCmd = vscode.commands.registerCommand("fx-extension.openSamples", (...args) =>
    Correlator.run(handlers.openSamplesHandler, args)
  );
  context.subscriptions.push(openSamplesCmd);

  const openDocumentCmd = vscode.commands.registerCommand("fx-extension.openDocument", (...args) =>
    Correlator.run(handlers.openDocumentHandler, args)
  );
  context.subscriptions.push(openDocumentCmd);

  const openAccountLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openAccountLink",
    (...args) => Correlator.run(handlers.openAccountLinkHandler, args)
  );
  context.subscriptions.push(openAccountLinkCmd);

  const openEnvLinkCmd = vscode.commands.registerCommand("fx-extension.openEnvLink", (...args) =>
    Correlator.run(handlers.openEnvLinkHandler, args)
  );
  context.subscriptions.push(openEnvLinkCmd);

  const openDevelopmentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDevelopmentLink",
    (...args) => Correlator.run(handlers.openDevelopmentLinkHandler, args)
  );
  context.subscriptions.push(openDevelopmentLinkCmd);

  const openDeploymentLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openDeploymentLink",
    (...args) => Correlator.run(handlers.openDeploymentLinkHandler, args)
  );
  context.subscriptions.push(openDeploymentLinkCmd);

  const openHelpFeedbackLinkCmd = vscode.commands.registerCommand(
    "fx-extension.openHelpFeedbackLink",
    (...args) => Correlator.run(handlers.openHelpFeedbackLinkHandler, args)
  );
  context.subscriptions.push(openHelpFeedbackLinkCmd);

  const openManifestCmd = vscode.commands.registerCommand("fx-extension.openManifest", (...args) =>
    Correlator.run(handlers.openManifestHandler, args)
  );
  context.subscriptions.push(openManifestCmd);

  const openManifestSchemaCmd = vscode.commands.registerCommand(
    "fx-extension.openSchema",
    (...args) => {
      Correlator.run(handlers.openExternalHandler, args);
    }
  );
  context.subscriptions.push(openManifestSchemaCmd);

  const openAppManagementCmd = vscode.commands.registerCommand(
    "fx-extension.openAppManagement",
    (...args) => Correlator.run(handlers.openAppManagement, args)
  );
  context.subscriptions.push(openAppManagementCmd);

  const openBotManagementCmd = vscode.commands.registerCommand(
    "fx-extension.openBotManagement",
    (...args) => Correlator.run(handlers.openBotManagement, args)
  );
  context.subscriptions.push(openBotManagementCmd);

  const openReportIssuesCmd = vscode.commands.registerCommand(
    "fx-extension.openReportIssues",
    (...args) => Correlator.run(handlers.openReportIssues, args)
  );
  context.subscriptions.push(openReportIssuesCmd);

  const m365AccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.m365AccountSettings",
    () => Correlator.run(handlers.openM365AccountHandler)
  );
  context.subscriptions.push(m365AccountSettingsCmd);

  const azureAccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.azureAccountSettings",
    () => Correlator.run(handlers.openAzureAccountHandler)
  );
  context.subscriptions.push(azureAccountSettingsCmd);

  const cmpAccountsCmd = vscode.commands.registerCommand("fx-extension.cmpAccounts", () =>
    Correlator.run(handlers.cmpAccountsHandler)
  );
  context.subscriptions.push(cmpAccountsCmd);

  const decryptCmd = vscode.commands.registerCommand(
    "fx-extension.decryptSecret",
    (cipher, selection) => Correlator.run(handlers.decryptSecret, cipher, selection)
  );
  context.subscriptions.push(decryptCmd);

  const adaptiveCardCodeLensCmd = vscode.commands.registerCommand(
    "fx-extension.OpenAdaptiveCardExt",
    (...args) => Correlator.run(handlers.openAdaptiveCardExt, args)
  );
  context.subscriptions.push(adaptiveCardCodeLensCmd);

  const manifestTemplateCodeLensCmd = vscode.commands.registerCommand(
    "fx-extension.openPreviewFile",
    (...args) => Correlator.run(handlers.openPreviewManifest, args)
  );
  context.subscriptions.push(manifestTemplateCodeLensCmd);

  const openConfigStateCmd = vscode.commands.registerCommand(
    "fx-extension.openConfigState",
    (...args) => Correlator.run(handlers.openConfigStateFile, args)
  );
  context.subscriptions.push(openConfigStateCmd);

  const updateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.updatePreviewFile",
    (...args) => Correlator.run(handlers.updatePreviewManifest, args)
  );
  context.subscriptions.push(updateManifestCmd);

  const editManifestTemplateCmd = vscode.commands.registerCommand(
    "fx-extension.editManifestTemplate",
    (...args) => Correlator.run(handlers.editManifestTemplate, args)
  );
  context.subscriptions.push(editManifestTemplateCmd);

  const createNewEnvironment = vscode.commands.registerCommand(
    "fx-extension.addEnvironment",
    (...args) => Correlator.run(handlers.createNewEnvironment, args)
  );
  context.subscriptions.push(createNewEnvironment);

  const refreshEnvironment = vscode.commands.registerCommand(
    "fx-extension.refreshEnvironment",
    (...args) => Correlator.run(handlers.refreshEnvironment, args)
  );
  context.subscriptions.push(refreshEnvironment);

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

  const preview = vscode.commands.registerCommand("fx-extension.preview", (node) => {
    Correlator.run(handlers.treeViewPreviewHandler, node.command.title);
  });
  context.subscriptions.push(preview);

  const previewWithIcon = vscode.commands.registerCommand(
    "fx-extension.previewWithIcon",
    (node) => {
      Correlator.run(handlers.treeViewPreviewHandler, node.command.title);
    }
  );
  context.subscriptions.push(previewWithIcon);

  const openSubscriptionInPortal = vscode.commands.registerCommand(
    "fx-extension.openSubscriptionInPortal",
    (node) => {
      const envName = node.commandId.split(".").pop();
      Correlator.run(handlers.openSubscriptionInPortal, envName);
    }
  );
  context.subscriptions.push(openSubscriptionInPortal);

  const openResourceGroupInPortal = vscode.commands.registerCommand(
    "fx-extension.openResourceGroupInPortal",
    (node) => {
      const envName = node.commandId.split(".").pop();
      Correlator.run(handlers.openResourceGroupInPortal, envName);
    }
  );
  context.subscriptions.push(openResourceGroupInPortal);

  const grantPermission = vscode.commands.registerCommand(
    "fx-extension.grantPermission",
    (node) => {
      const envName = node.commandId.split(".").pop();
      Correlator.run(handlers.grantPermission, envName);
    }
  );
  context.subscriptions.push(grantPermission);

  const listCollaborator = vscode.commands.registerCommand(
    "fx-extension.listCollaborator",
    (node) => {
      const envName = node.commandId.split(".").pop();
      Correlator.run(handlers.listCollaborator, envName);
    }
  );
  context.subscriptions.push(listCollaborator);

  const workspacePath = getWorkspacePath();
  vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isMultiEnvEnabled",
    isMultiEnvEnabled() && isValidProject(workspacePath)
  );

  vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isSPFx",
    workspacePath && (await isSPFxProject(workspacePath))
  );

  vscode.commands.executeCommand(
    "setContext",
    "fx-extension.canUpgradeToArmAndMultiEnv",
    await canUpgradeToArmAndMultiEnv(workspacePath)
  );

  vscode.commands.executeCommand(
    "setContext",
    "fx-extension.isRemoteCollaborateEnabled",
    isRemoteCollaborateEnabled() && isValidProject(workspacePath)
  );

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

  const adaptiveCardCodeLensProvider = new AdaptiveCardCodeLensProvider();
  const adaptiveCardFilePattern = `**/${AdaptiveCardsFolderName}/*.json`;
  const adaptiveCardFileSelector = {
    language: "json",
    scheme: "file",
    pattern: adaptiveCardFilePattern,
  };

  const manifestTemplateCodeLensProvider = new ManifestTemplateCodeLensProvider();
  const manifestTemplateSelecctor = {
    language: "json",
    scheme: "file",
    pattern: `**/manifest.*.template.json`,
  };
  const manifestPreviewSelector = {
    language: "json",
    scheme: "file",
    pattern: `**/${BuildFolderName}/${AppPackageFolderName}/manifest.*.json`,
  };

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(userDataSelector, codelensProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(localDebugDataSelector, codelensProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      adaptiveCardFileSelector,
      adaptiveCardCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestTemplateSelecctor,
      manifestTemplateCodeLensProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      manifestPreviewSelector,
      manifestTemplateCodeLensProvider
    )
  );

  // Register debug configuration provider
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

  // Register task and debug event handlers, as well as sending telemetries
  registerTeamsfxTaskAndDebugEvents();

  await handlers.cmdHdlLoadTreeView(context);

  // Register local debug run icon
  const runIconCmd = vscode.commands.registerCommand("fx-extension.selectAndDebug", (...args) =>
    Correlator.run(handlers.selectAndDebugHandler, args)
  );
  context.subscriptions.push(runIconCmd);
  registerRunIcon();

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(handlers.saveTextDocumentHandler)
  );

  ext.context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(enableMigrateV1));
  enableMigrateV1();
  const migrateV1Cmd = vscode.commands.registerCommand("fx-extension.migrateV1Project", () =>
    Correlator.run(handlers.migrateV1ProjectHandler)
  );
  context.subscriptions.push(migrateV1Cmd);

  const migrateTeamsTabAppCmd = vscode.commands.registerCommand(
    "fx-extension.migrateTeamsTabApp",
    () => Correlator.run(handlers.migrateTeamsTabAppHandler)
  );
  context.subscriptions.push(migrateTeamsTabAppCmd);

  const migrateTeamsManifestCmd = vscode.commands.registerCommand(
    "fx-extension.migrateTeamsManifest",
    () => Correlator.run(handlers.migrateTeamsManifestHandler)
  );
  context.subscriptions.push(migrateTeamsManifestCmd);

  // 2. Call activate function of toolkit core.
  await handlers.activate();

  if (!TreatmentVariableValue.isEmbeddedSurvey) {
    const survey = ExtensionSurvey.getInstance();
    survey.activate();
  }

  openWelcomePageAfterExtensionInstallation();
}

// this method is called when your extension is deactivated
export function deactivate() {
  handlers.cmdHdlDisposeTreeView();
  disableRunIcon();
}

function initializeContextKey() {
  if (isValidNode()) {
    vscode.commands.executeCommand("setContext", "fx-extension.isNotValidNode", false);
  } else {
    vscode.commands.executeCommand("setContext", "fx-extension.isNotValidNode", true);
  }
}
