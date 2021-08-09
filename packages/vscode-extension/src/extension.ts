// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";
import { initializeExtensionVariables } from "./extensionVariables";
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
import { CryptoCodeLensProvider } from "./codeLensProvider";
import { Correlator } from "@microsoft/teamsfx-core";

export let VS_CODE_UI: VsCodeUI;

export async function activate(context: vscode.ExtensionContext) {
  VsCodeLogInstance.info(StringResources.vsc.extension.activate);
  VS_CODE_UI = new VsCodeUI(context);
  // Init context
  initializeExtensionVariables(context);

  context.subscriptions.push(new ExtTelemetry.Reporter(context));

  await exp.initialize(context);

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

  // 1.7 validate dependencies command (hide from UI)
  const validateDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-dependencies",
    () => Correlator.run(handlers.validateDependenciesHandler)
  );
  context.subscriptions.push(validateDependenciesCmd);

  const validateSpfxDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-spfx-dependencies",
    () => Correlator.run(handlers.validateSpfxDependenciesHandler)
  );
  context.subscriptions.push(validateSpfxDependenciesCmd);

  // 1.8 pre debug check command (hide from UI)
  const preDebugCheckCmd = vscode.commands.registerCommand("fx-extension.pre-debug-check", () =>
    Correlator.run(handlers.preDebugCheckHandler)
  );
  context.subscriptions.push(preDebugCheckCmd);

  // 1.9 Register backend extensions install command (hide from UI)
  const backendExtensionsInstallCmd = vscode.commands.registerCommand(
    "fx-extension.backend-extensions-install",
    () => Correlator.run(handlers.backendExtensionsInstallHandler)
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

  const openSamplesCmd = vscode.commands.registerCommand("fx-extension.openSamples", (...args) =>
    Correlator.run(handlers.openSamplesHandler, args)
  );
  context.subscriptions.push(openSamplesCmd);

  const openDocumentCmd = vscode.commands.registerCommand("fx-extension.openDocument", (...args) =>
    Correlator.run(handlers.openDocumentHandler, args)
  );
  context.subscriptions.push(openDocumentCmd);

  const openManifestCmd = vscode.commands.registerCommand("fx-extension.openManifest", (...args) =>
    Correlator.run(handlers.openManifestHandler, args)
  );
  context.subscriptions.push(openManifestCmd);

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

  const grantPermissionCmd = vscode.commands.registerCommand(
    "fx-extension.grantPermission",
    (...args) => Correlator.run(handlers.grantPermissionHandler, args)
  );
  context.subscriptions.push(grantPermissionCmd);

  const checkPermissionCmd = vscode.commands.registerCommand(
    "fx-extension.checkPermission",
    (...args) => Correlator.run(handlers.checkPermissionHandler, args)
  );
  context.subscriptions.push(checkPermissionCmd);

  // Setup CodeLens provider for userdata file
  const codelensProvider = new CryptoCodeLensProvider();
  const userDataSelector = {
    language: "plaintext",
    scheme: "file",
    pattern: "**/.fx/*.userdata",
  };
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(userDataSelector, codelensProvider)
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
    vscode.workspace.onDidSaveTextDocument(handlers.saveTextDocumentHandler)
  );

  // 2. Call activate function of toolkit core.
  await handlers.activate();

  const survey = new ExtensionSurvey(context);
  survey.activate();

  openWelcomePageAfterExtensionInstallation();
}

// this method is called when your extension is deactivated
export function deactivate() {
  handlers.cmdHdlDisposeTreeView();
  disableRunIcon();
}
