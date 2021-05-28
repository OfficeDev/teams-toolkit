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

export let VS_CODE_UI:VsCodeUI;

export async function activate(context: vscode.ExtensionContext) {
  VsCodeLogInstance.info(StringResources.vsc.extension.activate);
  VS_CODE_UI = new VsCodeUI(context);
  // Init context
  initializeExtensionVariables(context);

  context.subscriptions.push(new ExtTelemetry.Reporter(context));

  // 1.1 Register the creating command.
  const createCmd = vscode.commands.registerCommand(
    "fx-extension.create",
    handlers.createNewProjectHandler
  );
  context.subscriptions.push(createCmd);

  // 1.2 Register the creating command.
  const updateCmd = vscode.commands.registerCommand(
    "fx-extension.update",
    handlers.addResourceHandler
  );
  context.subscriptions.push(updateCmd);

  // add capability
  const addCapCmd = vscode.commands.registerCommand(
    "fx-extension.addCapability",
    handlers.addCapabilityHandler
  );
  context.subscriptions.push(addCapCmd);

  // 1.3 Register the provision command.
  const provisionCmd = vscode.commands.registerCommand(
    "fx-extension.provision",
    handlers.provisionHandler
  );
  context.subscriptions.push(provisionCmd);

  // 1.5 Register the deploy command.
  const deployCmd = vscode.commands.registerCommand("fx-extension.deploy", handlers.deployHandler);
  context.subscriptions.push(deployCmd);

  const validateManifestCmd = vscode.commands.registerCommand(
    "fx-extension.validateManifest",
    handlers.validateManifestHandler
  );
  context.subscriptions.push(validateManifestCmd);

  const buildPackageCmd = vscode.commands.registerCommand(
    "fx-extension.build",
    handlers.buildPackageHandler
  );
  context.subscriptions.push(buildPackageCmd);

  const publishCmd = vscode.commands.registerCommand(
    "fx-extension.publish",
    handlers.publishHandler
  );
  context.subscriptions.push(publishCmd);
 
  // 1.7 validate dependencies command (hide from UI)
  const validateDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-dependencies",
    handlers.validateDependenciesHandler
  );
  context.subscriptions.push(validateDependenciesCmd);

  const validateSpfxDependenciesCmd = vscode.commands.registerCommand(
    "fx-extension.validate-spfx-dependencies",
    handlers.validateSpfxDependenciesHandler
  );
  context.subscriptions.push(validateSpfxDependenciesCmd);

  // 1.8 pre debug check command (hide from UI)
  const preDebugCheckCmd = vscode.commands.registerCommand(
    "fx-extension.pre-debug-check",
    handlers.preDebugCheckHandler
  );
  context.subscriptions.push(preDebugCheckCmd);

  // 1.9 Register backend extensions install command (hide from UI)
  const backendExtensionsInstallCmd = vscode.commands.registerCommand(
    "fx-extension.backend-extensions-install",
    handlers.backendExtensionsInstallHandler
  );
  context.subscriptions.push(backendExtensionsInstallCmd);

  // 1.10 Register teamsfx task provider
  const taskProvider: TeamsfxTaskProvider = new TeamsfxTaskProvider();
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(TeamsfxTaskProvider.type, taskProvider)
  );

  const openWelcomeCmd = vscode.commands.registerCommand(
    "fx-extension.openWelcome",
    handlers.openWelcomeHandler
  );
  context.subscriptions.push(openWelcomeCmd);

  const openSamplesCmd = vscode.commands.registerCommand(
    "fx-extension.openSamples",
    handlers.openSamplesHandler
  );
  context.subscriptions.push(openSamplesCmd);

  const openDocumentCmd = vscode.commands.registerCommand(
    "fx-extension.openDocument",
    handlers.openDocumentHandler
  );
  context.subscriptions.push(openDocumentCmd);

  const openManifestCmd = vscode.commands.registerCommand(
    "fx-extension.openManifest",
    handlers.openManifestHandler
  );
  context.subscriptions.push(openManifestCmd);

  const openAppManagementCmd = vscode.commands.registerCommand(
    "fx-extension.openAppManagement",
    handlers.openAppManagement
  );
  context.subscriptions.push(openAppManagementCmd);

  const openBotManagementCmd = vscode.commands.registerCommand(
    "fx-extension.openBotManagement",
    handlers.openBotManagement
  );
  context.subscriptions.push(openBotManagementCmd);

  const openReportIssuesCmd = vscode.commands.registerCommand(
    "fx-extension.openReportIssues",
    handlers.openReportIssues
  );
  context.subscriptions.push(openReportIssuesCmd);

  const m365AccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.m365AccountSettings",
    handlers.openM365AccountHandler
  );
  context.subscriptions.push(m365AccountSettingsCmd);

  const azureAccountSettingsCmd = vscode.commands.registerCommand(
    "fx-extension.azureAccountSettings",
    handlers.openAzureAccountHandler
  );
  context.subscriptions.push(azureAccountSettingsCmd);

  const cmpAccountsCmd = vscode.commands.registerCommand(
    "fx-extension.cmpAccounts",
    handlers.cmpAccountsHandler
  );
  context.subscriptions.push(cmpAccountsCmd);

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
  // 2. Call activate function of toolkit core.
  await handlers.activate();

  const survey = new ExtensionSurvey(context);
  survey.activate();

  openWelcomePageAfterExtensionInstallation();
}

// this method is called when your extension is deactivated
export function deactivate() {
  handlers.cmdHdlDisposeTreeView();
}
