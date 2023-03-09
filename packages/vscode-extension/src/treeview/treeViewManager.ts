// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { TreeCategory } from "@microsoft/teamsfx-api";
import { isV3Enabled } from "@microsoft/teamsfx-core";

import { AdaptiveCardCodeLensProvider } from "../codeLensProvider";
import { TreatmentVariableValue } from "../exp/treatmentVariables";
import { localize } from "../utils/localizeUtils";
import accountTreeViewProviderInstance from "./account/accountTreeViewProvider";
import { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import envTreeProviderInstance from "./environmentTreeViewProvider";
import { CommandStatus, TreeViewCommand } from "./treeViewCommand";
import { isTDPIntegrationEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";

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

  public registerTreeViews(context: vscode.ExtensionContext): void {
    const disposables: vscode.Disposable[] = [];

    this.registerAccount(disposables);
    this.registerEnvironment(disposables);
    this.registerDevelopment(disposables);
    this.registerDeployment(disposables);
    this.registerHelper(disposables);

    context.subscriptions.push(...disposables);
  }

  public async updateTreeViewsByContent(removeProjectRelatedCommands = false): Promise<void> {
    const hasAdaptiveCard = await AdaptiveCardCodeLensProvider.detectedAdaptiveCards();
    const developmentTreeviewProvider = this.getTreeView(
      "teamsfx-development"
    ) as CommandsTreeViewProvider;
    const developmentCommands = developmentTreeviewProvider.getCommands();
    developmentCommands.splice(0);
    developmentCommands.push(...this.getDevelopmentCommands());
    if (removeProjectRelatedCommands) {
      developmentCommands.splice(3);
    } else if (hasAdaptiveCard) {
      // after "Preview your Teams app" command, the adaptive card will be shown
      const previewCommandIndex = developmentCommands.findIndex(
        (command) => command.commandId === "fx-extension.debug"
      );
      if (previewCommandIndex >= 0) {
        developmentCommands.splice(
          previewCommandIndex + 1,
          0,
          new TreeViewCommand(
            localize("teamstoolkit.commandsTreeViewProvider.previewAdaptiveCard"),
            localize("teamstoolkit.commandsTreeViewProvider.previewACDescription"),
            "fx-extension.OpenAdaptiveCardExt",
            undefined,
            { name: "eye", custom: false }
          )
        );
      }
    }
    developmentTreeviewProvider.refresh();
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
      provider.refresh();
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
      provider.refresh();
    }
  }

  public dispose() {
    this.treeviewMap.forEach((value) => {
      (value as vscode.Disposable).dispose();
    });
  }

  private registerAccount(disposables: vscode.Disposable[]) {
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-accounts", accountTreeViewProviderInstance)
    );
    this.treeviewMap.set("teamsfx-accounts", accountTreeViewProviderInstance);
  }

  private registerEnvironment(disposables: vscode.Disposable[]) {
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-environment", envTreeProviderInstance)
    );
    this.treeviewMap.set("teamsfx-environment", envTreeProviderInstance);
  }

  private getDevelopmentCommands(): TreeViewCommand[] {
    return [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.createProjectTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.createProjectDescription"),
        "fx-extension.create",
        "createProject",
        { name: "new-folder", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
        undefined,
        { name: "library", custom: false },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.guideTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.guideDescription"),
        "fx-extension.selectTutorials",
        undefined,
        { name: "notebook", custom: false },
        TreeCategory.GettingStarted
      ),
      ...(isV3Enabled()
        ? []
        : [
            new TreeViewCommand(
              localize("teamstoolkit.commandsTreeViewProvider.addFeatureTitle"),
              localize("teamstoolkit.commandsTreeViewProvider.addFeatureDescription"),
              "fx-extension.addFeature",
              "addFeature",
              { name: "teamsfx-add-feature", custom: false }
            ),
          ]),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.previewTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.previewDescription"),
        "fx-extension.debug",
        undefined,
        { name: "debug-alt", custom: false }
      ),
      ...(isV3Enabled()
        ? [
            new TreeViewCommand(
              localize("teamstoolkit.commandsTreeViewProvider.addEnvironmentTitle"),
              localize("teamstoolkit.commandsTreeViewProvider.addEnvironmentDescription"),
              "fx-extension.addEnvironment",
              undefined,
              { name: "teamsfx-add-environment", custom: false }
            ),
            new TreeViewCommand(
              localize("teamstoolkit.commandsTreeViewProvider.manageCollaboratorTitle"),
              localize("teamstoolkit.commandsTreeViewProvider.manageCollaboratorDescription"),
              "fx-extension.manageCollaborator",
              "manageCollaborator",
              { name: "organization", custom: false }
            ),
          ]
        : [
            new TreeViewCommand(
              localize("teamstoolkit.commandsTreeViewProvider.manifestEditorTitle"),
              localize("teamstoolkit.commandsTreeViewProvider.manifestEditorDescription"),
              "fx-extension.openManifest",
              "manifestEditor",
              { name: "edit", custom: false }
            ),
          ]),
    ];
  }

  private registerDevelopment(disposables: vscode.Disposable[]) {
    const developmentCommands = this.getDevelopmentCommands();

    const developmentProvider = new CommandsTreeViewProvider(developmentCommands);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-development", developmentProvider)
    );
    this.storeCommandsIntoMap(developmentCommands);
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
    const isTdpIntegration = isTDPIntegrationEnabled();
    const deployCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.provisionTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.provisionDescription"),
        "fx-extension.provision",
        "provision",
        { name: "type-hierarchy", custom: false }
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
        { name: "export", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.buildPackageDescription"),
        "fx-extension.build",
        "buildPackage",
        { name: "package", custom: false }
      ),
    ];

    if (!isTdpIntegration) {
      deployCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalTitle"),
          localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription"),
          "fx-extension.openAppManagement",
          undefined,
          { name: "teamsfx-developer-portal", custom: false }
        )
      );
    }

    if (isTdpIntegration) {
      deployCommand.push(
        new TreeViewCommand(
          localize("teamstoolkit.commandsTreeViewProvider.publishInDevPortalTitle"),
          localize("teamstoolkit.commandsTreeViewProvider.publishInDevPortalDescription"),
          "fx-extension.publishInDeveloperPortal",
          "publish",
          { name: "teamsfx-developer-portal", custom: false }
        )
      );
    }
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
        localize("teamstoolkit.commandsTreeViewProvider.documentationTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.documentationDescription"),
        "fx-extension.openDocument",
        undefined,
        { name: "book", custom: false },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.getStartedTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.getStarted"),
        "fx-extension.openWelcome",
        undefined,
        { name: "symbol-event", custom: false },
        TreeCategory.GettingStarted
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesDescription"),
        "fx-extension.openReportIssues",
        undefined,
        { name: "github", custom: false },
        TreeCategory.Feedback
      ),
    ];
    const helpProvider = new CommandsTreeViewProvider(helpCommand);
    disposables.push(
      vscode.window.registerTreeDataProvider(
        isV3Enabled() ? "teamsfx-help" : "teamsfx-help-and-feedback",
        helpProvider
      )
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
