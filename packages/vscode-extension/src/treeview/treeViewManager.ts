// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { TreeCategory } from "@microsoft/teamsfx-api";
import { isInitAppEnabled, isValidProject } from "@microsoft/teamsfx-core";

import { AdaptiveCardCodeLensProvider } from "../codeLensProvider";
import { isSPFxProject } from "../utils/commonUtils";
import { localize } from "../utils/localizeUtils";
import { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { TreeViewCommand } from "./treeViewCommand";

class TreeViewManager {
  private static instance: TreeViewManager;
  private treeviewMap: Map<string, any>;
  private commandMap: Map<string, TreeViewCommand>;
  private exclusiveCommands: string[];

  private constructor() {
    this.treeviewMap = new Map();
    this.commandMap = new Map<string, TreeViewCommand>();
    this.exclusiveCommands = [
      "fx-extension.create",
      "fx-extension.addCapability",
      "fx-extension.update",
      "fx-extension.openManifest",
      "fx-extension.OpenAdaptiveCardExt",
      "fx-extension.provision",
      "fx-extension.build",
      "fx-extension.deploy",
      "fx-extension.publish",
      "fx-extension.addCICDWorkflows",
    ];
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
      // No need to register TreeView because walkthrough is enabled.
      // return this.registerTreeViewsForNonTeamsFxProject();
    }
    return [];
  }

  public getTreeView(viewName: string) {
    return this.treeviewMap.get(viewName);
  }

  public async runCommand(commandName: string, ...args: unknown[]) {
    const command = this.commandMap.get(commandName);
    command?.setStatus(true);
    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
    command?.setStatus(false);
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
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
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
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          { name: "new-folder", custom: false }
        )
      );
    }
    developmentCommand.push(
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "library", custom: false }
      )
    );

    if (isNonSPFx) {
      developmentCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.addCapabilitiesTitleNew"),
          localize("teamstoolkit.commandsTreeViewProvider.addCapabilitiesDescription"),
          "fx-extension.addCapability",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          { name: "addCapability", custom: true }
        ),
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.addResourcesTitleNew"),
          localize("teamstoolkit.commandsTreeViewProvider.addResourcesDescription"),
          "fx-extension.update",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          { name: "addResources", custom: true }
        )
      );
    }

    developmentCommand.push(
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.manifestEditorTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.manifestEditorDescription"),
        "fx-extension.openManifest",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "edit", custom: false }
      )
    );

    if (hasAdaptiveCard) {
      developmentCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.previewAdaptiveCard"),
          localize("teamstoolkit.commandsTreeViewProvider.previewACDescription"),
          "fx-extension.OpenAdaptiveCardExt",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          { name: "eye", custom: false }
        )
      );
    }

    return developmentCommand;
  }

  private registerDevelopment(commands: TreeViewCommand[], disposables: vscode.Disposable[]) {
    this.storeCommandsIntoMap(commands);
    const developmentProvider = new CommandsTreeViewProvider(commands);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-development", developmentProvider)
    );
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
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "type-hierarchy", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageDescription"),
        "fx-extension.build",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "package", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.deployTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.deployDescription"),
        "fx-extension.deploy",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "cloud-upload", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.publishTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.publishDescription"),
        "fx-extension.publish",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "publish", custom: true }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.addCICDWorkflowsTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.addCICDWorkflowsDescription"),
        "fx-extension.addCICDWorkflows",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "sync", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription"),
        "fx-extension.openAppManagement",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "developerPortal", custom: true }
      ),
    ];

    this.storeCommandsIntoMap(deployCommand);
    const deployProvider = new CommandsTreeViewProvider(deployCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-deployment", deployProvider));
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
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "lightningBolt_16", custom: true }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.documentationTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.documentationDescription"),
        "fx-extension.openDocument",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "book", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesDescription"),
        "fx-extension.openReportIssues",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.Feedback,
        undefined,
        { name: "github", custom: false }
      ),
    ];
    const helpProvider = new CommandsTreeViewProvider(helpCommand);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-help-and-feedback", helpProvider)
    );
    this.treeviewMap.set("teamsfx-help-and-feedback", helpProvider);
  }

  private storeCommandsIntoMap(commands: TreeViewCommand[]) {
    for (const command of commands) {
      if (command.commandId) {
        this.commandMap.set(command.commandId, command);
      }
    }
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
}

export default TreeViewManager.getInstance();
