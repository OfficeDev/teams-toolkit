// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { TreeCategory } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";

import { AdaptiveCardCodeLensProvider } from "../codeLensProvider";
import { isSPFxProject } from "../utils/commonUtils";
import { localize } from "../utils/localizeUtils";
import { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { CommandStatus, TreeViewCommand } from "./treeViewCommand";
import envTreeProviderInstance from "./environmentTreeViewProvider";

class TreeViewManager {
  private static instance: TreeViewManager;
  private commandMap: Map<string, TreeViewCommand>;

  private treeviewMap: Map<string, any>;
  private treeViewProvidersToUpdate: Set<CommandsTreeViewProvider>;
  private runningCommand: TreeViewCommand | undefined;

  private constructor() {
    this.treeviewMap = new Map();
    this.commandMap = new Map<string, TreeViewCommand>();
    this.treeViewProvidersToUpdate = new Set<CommandsTreeViewProvider>();
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

  public async setRunningCommand(
    commandName: string,
    blockedCommands: string[],
    blockingTooltip?: string
  ) {
    const command = this.commandMap.get(commandName);
    if (!command) {
      return;
    }
    this.runningCommand = command;
    command.setStatus(CommandStatus.Running);
    for (const blockedCmd of blockedCommands) {
      const blockedCommand = this.commandMap.get(blockedCmd);
      if (blockedCommand) {
        blockedCommand.setStatus(CommandStatus.Blocked, blockingTooltip);
      }
    }
    for (const provider of this.treeViewProvidersToUpdate.values()) {
      provider.refresh([]);
    }
  }

  public async restoreRunningCommand(blockedCommands: string[]) {
    if (!this.runningCommand) {
      return;
    }
    this.runningCommand.setStatus(CommandStatus.Ready);
    for (const blockedCmd of blockedCommands) {
      const blockedCommand = this.commandMap.get(blockedCmd);
      if (blockedCommand) {
        blockedCommand.setStatus(CommandStatus.Ready);
      }
    }
    for (const provider of this.treeViewProvidersToUpdate.values()) {
      provider.refresh([]);
    }
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

    const isNonSPFx = (workspacePath && !isSPFxProject(workspacePath)) as boolean;
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

    return disposables;
  }

  private registerAccount(disposables: vscode.Disposable[]) {
    const accountProvider = new CommandsTreeViewProvider([]);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-accounts", accountProvider));
    this.treeviewMap.set("teamsfx-accounts", accountProvider);
  }

  private registerEnvironment(disposables: vscode.Disposable[]) {
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-environment", envTreeProviderInstance)
    );
    this.treeviewMap.set("teamsfx-environment", envTreeProviderInstance);
  }

  private getDevelopmentCommands(isNonSPFx: boolean, hasAdaptiveCard: boolean) {
    const developmentCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.createProjectTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.createProjectDescription"),
        "fx-extension.create",
        "createProject",
        { name: "new-folder", custom: false }
      ),
    ];
    developmentCommand.push(
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
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
          "addCapabilities",
          { name: "addCapability", custom: true }
        ),
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.addResourcesTitleNew"),
          localize("teamstoolkit.commandsTreeViewProvider.addResourcesDescription"),
          "fx-extension.update",
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
    this.storeCommandsIntoMap(commands);
    this.treeviewMap.set("teamsfx-development", developmentProvider);
    this.treeViewProvidersToUpdate.add(developmentProvider);
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
        "provision",
        { name: "type-hierarchy", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageDescription"),
        "fx-extension.build",
        "buildPackage",
        { name: "package", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.deployTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.deployDescription"),
        "fx-extension.deploy",
        "deploy",
        { name: "cloud-upload", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.publishTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.publishDescription"),
        "fx-extension.publish",
        "publish",
        { name: "publish", custom: true }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.addCICDWorkflowsTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.addCICDWorkflowsDescription"),
        "fx-extension.addCICDWorkflows",
        "addCICDWorkflows",
        { name: "sync", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription"),
        "fx-extension.openAppManagement",
        undefined,
        { name: "developerPortal", custom: true }
      ),
    ];

    const deployProvider = new CommandsTreeViewProvider(deployCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-deployment", deployProvider));
    this.storeCommandsIntoMap(deployCommand);
    this.treeviewMap.set("teamsfx-deployment", deployProvider);
    this.treeViewProvidersToUpdate.add(deployProvider);
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
        undefined,
        { name: "lightningBolt_16", custom: true },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.tutorialTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.tutorialDescription"),
        "fx-extension.selectTutorials",
        undefined,
        { name: "tutorial", custom: true },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.documentationTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.documentationDescription"),
        "fx-extension.openDocument",
        undefined,
        { name: "book", custom: false },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesDescription"),
        "fx-extension.openReportIssues",
        undefined,
        { name: "github", custom: false },
        TreeCategory.Feedback
      ),
    ];
    const helpProvider = new CommandsTreeViewProvider(helpCommand);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-help-and-feedback", helpProvider)
    );
    this.storeCommandsIntoMap(helpCommand);
    this.treeviewMap.set("teamsfx-help-and-feedback", helpProvider);
  }

  private storeCommandsIntoMap(commands: TreeViewCommand[]) {
    for (const command of commands) {
      if (command.commandId) {
        this.commandMap.set(command.commandId, command);
      }
    }
  }
}

export default TreeViewManager.getInstance();
