// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Mutex } from "async-mutex";
// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { TreeCategory } from "@microsoft/teamsfx-api";
import { isInitAppEnabled, isValidProject } from "@microsoft/teamsfx-core";

import { AdaptiveCardCodeLensProvider } from "../codeLensProvider";
import { VS_CODE_UI } from "../extension";
import {
  addCapabilityHandler,
  addCICDWorkflowsHandler,
  addResourceHandler,
  buildPackageHandler,
  createNewProjectHandler,
  deployHandler,
  initProjectHandler,
  openAdaptiveCardExt,
  openAppManagement,
  openDocumentHandler,
  openManifestHandler,
  openReportIssues,
  openSamplesHandler,
  openWelcomeHandler,
  provisionHandler,
  publishHandler,
} from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import { getTriggerFromProperty, isSPFxProject } from "../utils/commonUtils";
import { localize } from "../utils/localizeUtils";
import { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { CommandStatus, TreeViewCommand } from "./treeViewCommand";

class TreeViewManager {
  private static instance: TreeViewManager;
  private commandMap: Map<string, [TreeViewCommand, CommandsTreeViewProvider]>;

  private treeviewMap: Map<string, any>;
  private exclusiveCommands: Set<string>;
  private runningCommand: TreeViewCommand | undefined;
  private mutex: Mutex;

  private constructor() {
    this.treeviewMap = new Map();
    this.commandMap = new Map<string, [TreeViewCommand, CommandsTreeViewProvider]>();
    this.mutex = new Mutex();
    this.exclusiveCommands = new Set([
      "fx-extension.create",
      "fx-extension.init",
      "fx-extension.addCapability",
      "fx-extension.update",
      "fx-extension.openManifest",
      "fx-extension.provision",
      "fx-extension.build",
      "fx-extension.deploy",
      "fx-extension.publish",
      "fx-extension.addCICDWorkflows",
    ]);
  }

  public static getInstance() {
    if (!TreeViewManager.instance) {
      TreeViewManager.instance = new TreeViewManager();
    }
    return TreeViewManager.instance;
  }

  public async registerTreeViews(workspacePath?: string): Promise<vscode.Disposable[]> {
    if (isValidProject(workspacePath)) {
      return this.registerTreeViewsForTeamsFxProject(workspacePath);
    } else {
      // TODO: remove this logic because walkthrough is enabled.
      return this.registerTreeViewsForNonTeamsFxProject();
    }
  }

  public getTreeView(viewName: string) {
    return this.treeviewMap.get(viewName);
  }

  public async runCommand(commandName: string, args: unknown[]) {
    if (!this.exclusiveCommands.has(commandName)) {
      return this.runNonBlockingCommand(commandName, args);
    }
    if (this.runningCommand) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.TreeViewCommandConcurrentExecution, {
        ...getTriggerFromProperty(args),
        [TelemetryProperty.RunningCommand]: this.runningCommand.commandId ?? "unknown",
        [TelemetryProperty.BlockedCommand]: commandName,
      });
      const blockedTooltip = this.runningCommand.getBlockingTooltip();
      if (blockedTooltip) {
        VS_CODE_UI.showMessage("warn", blockedTooltip, false);
      }
      return;
    }
    this.mutex.runExclusive(async () => await this.runBlockingCommand(commandName, args));
  }

  private runNonBlockingCommand(commandName: string, ...args: unknown[]) {
    const commandData = this.commandMap.get(commandName);
    if (commandData && commandData[0].callback) {
      commandData[0].callback(args);
    }
  }

  private async runBlockingCommand(commandName: string, ...args: unknown[]) {
    const commandData = this.commandMap.get(commandName);
    const treeViewProviderToUpdate = new Set<CommandsTreeViewProvider>();
    if (!commandData) {
      return;
    }
    const [command, treeViewProvider] = commandData;
    this.runningCommand = command;
    treeViewProviderToUpdate.add(treeViewProvider);
    command.setStatus(CommandStatus.Running);
    const blockingTooltip = command.getBlockingTooltip();
    for (const key of this.exclusiveCommands.values()) {
      if (key !== commandName) {
        const data = this.commandMap.get(key);
        if (data && data[0]) {
          data[0].setStatus(CommandStatus.Blocked, blockingTooltip);
          treeViewProviderToUpdate.add(data[1]);
        }
      }
    }
    for (const provider of treeViewProviderToUpdate.values()) {
      provider.refresh([]);
    }
    if (command.callback) {
      await command.callback(args);
    }
    command.setStatus(CommandStatus.Ready);
    for (const key of this.exclusiveCommands.values()) {
      if (key !== commandName) {
        const data = this.commandMap.get(key);
        if (data && data[0]) {
          data[0].setStatus(CommandStatus.Ready);
        }
      }
    }
    for (const provider of treeViewProviderToUpdate.values()) {
      provider.refresh([]);
    }
    this.runningCommand = undefined;
  }

  public dispose() {
    this.treeviewMap.forEach((value) => {
      (value as vscode.Disposable).dispose();
    });
  }

  private async registerTreeViewsForTeamsFxProject(workspacePath?: string) {
    const disposables: vscode.Disposable[] = [];

    this.registerAccount(disposables);
    this.registerEnvironment(disposables);

    const isNonSPFx = (workspacePath && !(await isSPFxProject(workspacePath))) as boolean;
    const hasAdaptiveCard = await AdaptiveCardCodeLensProvider.detectedAdaptiveCards();
    const developmentCommands = this.getDevelopmentCommands(isNonSPFx, hasAdaptiveCard);
    this.registerDevelopment(developmentCommands, disposables);
    this.registerDeployment(disposables);
    this.registerHelper(disposables);

    return disposables;
  }

  private async registerTreeViewsForNonTeamsFxProject() {
    const disposables: vscode.Disposable[] = [];

    this.registerAccount(disposables);
    this.registerEnvironment(disposables);
    const developmentCommands = this.getDevelopmentCommands(false, false);
    this.registerDevelopment(developmentCommands, disposables);
    this.registerDeployment(disposables);
    this.registerHelper(disposables);

    return disposables;
  }

  private registerAccount(disposables: vscode.Disposable[]) {
    const accountProvider = new CommandsTreeViewProvider([]);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-accounts", accountProvider));
    this.treeviewMap.set("teamsfx-accounts", accountProvider);
  }

  private registerEnvironment(disposables: vscode.Disposable[]) {
    const environmentProvider = new CommandsTreeViewProvider([]);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-environment", environmentProvider)
    );
    this.treeviewMap.set("teamsfx-environment", environmentProvider);
  }

  private getDevelopmentCommands(isNonSPFx: boolean, hasAdaptiveCard: boolean) {
    const developmentCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.createProjectTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.createProjectDescription"),
        "fx-extension.create",
        createNewProjectHandler,
        "createProject",
        { name: "new-folder", custom: false }
      ),
    ];
    if (isInitAppEnabled()) {
      // insert the init tree view command after the create project command
      developmentCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.initProjectTitleNew"),
          localize("teamstoolkit.commandsTreeViewProvider.initProjectDescription"),
          "fx-extension.init",
          initProjectHandler,
          "initProject",
          { name: "new-folder", custom: false }
        )
      );
    }
    developmentCommand.push(
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
        openSamplesHandler,
        undefined,
        { name: "library", custom: false },
        TreeCategory.GettingStarted
      )
    );

    if (isNonSPFx) {
      developmentCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.addCapabilitiesTitleNew"),
          localize("teamstoolkit.commandsTreeViewProvider.addCapabilitiesDescription"),
          "fx-extension.addCapability",
          addCapabilityHandler,
          "addCapabilities",
          { name: "addCapability", custom: true }
        ),
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.addResourcesTitleNew"),
          localize("teamstoolkit.commandsTreeViewProvider.addResourcesDescription"),
          "fx-extension.update",
          addResourceHandler,
          "addResources",
          { name: "addResources", custom: true }
        )
      );
    }

    developmentCommand.push(
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.manifestEditorTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.manifestEditorDescription"),
        "fx-extension.openManifest",
        openManifestHandler,
        "manifestEditor",
        { name: "edit", custom: false }
      )
    );

    if (hasAdaptiveCard) {
      developmentCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.previewAdaptiveCard"),
          localize("teamstoolkit.commandsTreeViewProvider.previewACDescription"),
          "fx-extension.OpenAdaptiveCardExt",
          openAdaptiveCardExt,
          undefined,
          { name: "eye", custom: false }
        )
      );
    }

    return developmentCommand;
  }

  private registerDevelopment(commands: TreeViewCommand[], disposables: vscode.Disposable[]) {
    const developmentProvider = new CommandsTreeViewProvider(commands);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-development", developmentProvider)
    );
    this.storeCommandsIntoMap(commands, developmentProvider);
    this.treeviewMap.set("teamsfx-development", developmentProvider);
    // codes for webview experiment:
    // let developmentProvider: any;
    // if (
    //   await exp
    //     .getExpService()
    //     .getTreatmentVariableAsync(
    //       TreatmentVariables.VSCodeConfig,
    //       TreatmentVariables.CustomizeTreeview,
    //       true
    //     )
    // ) {
    //   developmentProvider = new CommandsWebviewProvider(TreeContainerType.Development);
    //   disposables.push(
    //     vscode.window.registerWebviewViewProvider(
    //       "teamsfx-development-webview",
    //       developmentProvider
    //     )
    //   );
    // } else {
    //   developmentProvider = new CommandsTreeViewProvider(developmentCommand);
    //   disposables.push(
    //     vscode.window.registerTreeDataProvider("teamsfx-development", developmentProvider)
    //   );
    // }
  }

  private registerDeployment(disposables: vscode.Disposable[]) {
    const deployCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.provisionTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.provisionDescription"),
        "fx-extension.provision",
        provisionHandler,
        "provision",
        { name: "type-hierarchy", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageDescription"),
        "fx-extension.build",
        buildPackageHandler,
        "buildPackage",
        { name: "package", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.deployTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.deployDescription"),
        "fx-extension.deploy",
        deployHandler,
        "deploy",
        { name: "cloud-upload", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.publishTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.publishDescription"),
        "fx-extension.publish",
        publishHandler,
        "publish",
        { name: "publish", custom: true }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.addCICDWorkflowsTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.addCICDWorkflowsDescription"),
        "fx-extension.addCICDWorkflows",
        addCICDWorkflowsHandler,
        "addCICDWorkflows",
        { name: "sync", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription"),
        "fx-extension.openAppManagement",
        openAppManagement,
        undefined,
        { name: "developerPortal", custom: true }
      ),
    ];

    const deployProvider = new CommandsTreeViewProvider(deployCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-deployment", deployProvider));
    this.storeCommandsIntoMap(deployCommand, deployProvider);
    this.treeviewMap.set("teamsfx-deployment", deployProvider);
    // codes for webview experiment:
    // let deployProvider: any;
    // if (
    //   await exp
    //     .getExpService()
    //     .getTreatmentVariableAsync(
    //       TreatmentVariables.VSCodeConfig,
    //       TreatmentVariables.CustomizeTreeview,
    //       true
    //     )
    // ) {
    //   deployProvider = new CommandsWebviewProvider(TreeContainerType.Deployment);
    //   disposables.push(
    //     vscode.window.registerWebviewViewProvider("teamsfx-deployment-webview", deployProvider)
    //   );
    // } else {
    //   deployProvider = new CommandsTreeViewProvider(deployCommand);
    //   disposables.push(
    //     vscode.window.registerTreeDataProvider("teamsfx-deployment", deployProvider)
    //   );
    // }
  }

  private registerHelper(disposables: vscode.Disposable[]) {
    const helpCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.quickStartTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.quickStartDescription"),
        "fx-extension.openWelcome",
        openWelcomeHandler,
        undefined,
        { name: "lightningBolt_16", custom: true },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.documentationTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.documentationDescription"),
        "fx-extension.openDocument",
        openDocumentHandler,
        undefined,
        { name: "book", custom: false },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesDescription"),
        "fx-extension.openReportIssues",
        openReportIssues,
        undefined,
        { name: "github", custom: false },
        TreeCategory.Feedback
      ),
    ];
    const helpProvider = new CommandsTreeViewProvider(helpCommand);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-help-and-feedback", helpProvider)
    );
    this.storeCommandsIntoMap(helpCommand, helpProvider);
    this.treeviewMap.set("teamsfx-help-and-feedback", helpProvider);
  }

  private storeCommandsIntoMap(
    commands: TreeViewCommand[],
    treeViewProvider: CommandsTreeViewProvider
  ) {
    for (const command of commands) {
      if (command.commandId) {
        this.commandMap.set(command.commandId, [command, treeViewProvider]);
      }
    }
  }
}

export default TreeViewManager.getInstance();
