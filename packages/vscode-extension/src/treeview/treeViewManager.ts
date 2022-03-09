// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";
import * as exp from "../exp";
import { TreatmentVariables } from "../exp/treatmentVariables";
import { CommandsWebviewProvider } from "./webViewProvider/commandsWebviewProvider";
import { TreeContainerType } from "./webViewProvider/treeContainerType";
import { CommandsTreeViewProvider, TreeViewCommand } from "./commandsTreeViewProvider";
import { TreeCategory } from "@microsoft/teamsfx-api";
import { AdaptiveCardCodeLensProvider } from "../codeLensProvider";
import { isSPFxProject } from "../utils/commonUtils";
import { localize } from "../utils/localizeUtils";
import { isInitAppEnabled } from "@microsoft/teamsfx-core";

class TreeViewManager {
  private static instance: TreeViewManager;
  private treeviewMap: Map<string, any>;

  private constructor() {
    this.treeviewMap = new Map();
  }

  public static getInstance() {
    if (!TreeViewManager.instance) {
      TreeViewManager.instance = new TreeViewManager();
    }
    return TreeViewManager.instance;
  }

  public async registerTreeViews(workspacePath: string | undefined) {
    const disposables = [];

    const accountProvider = new CommandsTreeViewProvider([]);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-accounts", accountProvider));

    const environmentProvider = new CommandsTreeViewProvider([]);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-environment", environmentProvider)
    );

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
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "library", custom: false }
      ),
    ];

    if (isInitAppEnabled()) {
      // insert the init tree view command after the create project command
      developmentCommand.splice(
        1,
        0,
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

    if (workspacePath && !(await isSPFxProject(workspacePath))) {
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

    if (await AdaptiveCardCodeLensProvider.detectedAdaptiveCards()) {
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

    let developmentProvider: any;
    if (
      await exp
        .getExpService()
        .getTreatmentVariableAsync(
          TreatmentVariables.VSCodeConfig,
          TreatmentVariables.CustomizeTreeview,
          true
        )
    ) {
      developmentProvider = new CommandsWebviewProvider(TreeContainerType.Development);
      disposables.push(
        vscode.window.registerWebviewViewProvider(
          "teamsfx-development-webview",
          developmentProvider
        )
      );
    } else {
      developmentProvider = new CommandsTreeViewProvider(developmentCommand);
      disposables.push(
        vscode.window.registerTreeDataProvider("teamsfx-development", developmentProvider)
      );
    }

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
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription"),
        "fx-extension.openAppManagement",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "developerPortal", custom: true }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.cicdGuideTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.cicdGuideDescription"),
        "fx-extension.cicdGuide",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "sync", custom: false }
      ),
    ];

    let deployProvider: any;
    if (
      await exp
        .getExpService()
        .getTreatmentVariableAsync(
          TreatmentVariables.VSCodeConfig,
          TreatmentVariables.CustomizeTreeview,
          true
        )
    ) {
      deployProvider = new CommandsWebviewProvider(TreeContainerType.Deployment);
      disposables.push(
        vscode.window.registerWebviewViewProvider("teamsfx-deployment-webview", deployProvider)
      );
    } else {
      deployProvider = new CommandsTreeViewProvider(deployCommand);
      disposables.push(
        vscode.window.registerTreeDataProvider("teamsfx-deployment", deployProvider)
      );
    }

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

    this.treeviewMap.set("teamsfx-accounts", accountProvider);
    this.treeviewMap.set("teamsfx-environment", environmentProvider);
    this.treeviewMap.set("teamsfx-development", developmentProvider);
    this.treeviewMap.set("teamsfx-deployment", deployProvider);
    this.treeviewMap.set("teamsfx-help-and-feedback", helpProvider);

    return disposables;
  }

  public async registerEmptyProjectTreeViews() {
    const disposables = [];

    const accountProvider = new CommandsTreeViewProvider([]);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-accounts", accountProvider));

    const environmentProvider = new CommandsTreeViewProvider([]);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-environment", environmentProvider)
    );

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
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "library", custom: false }
      ),
    ];
    const developmentProvider = new CommandsTreeViewProvider(developmentCommand);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-development", developmentProvider)
    );

    const deployCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalTitleNew"),
        localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription"),
        "fx-extension.openAppManagement",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "developerPortal", custom: true }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.cicdGuideTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.cicdGuideDescription"),
        "fx-extension.cicdGuide",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "sync", custom: false }
      ),
    ];
    const deployProvider = new CommandsTreeViewProvider(deployCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-deployment", deployProvider));

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

    this.treeviewMap.set("teamsfx-accounts", accountProvider);
    this.treeviewMap.set("teamsfx-environment", environmentProvider);
    this.treeviewMap.set("teamsfx-development", developmentProvider);
    this.treeviewMap.set("teamsfx-deployment", deployProvider);
    this.treeviewMap.set("teamsfx-help-and-feedback", helpProvider);

    return disposables;
  }

  public getTreeView(viewName: string) {
    return this.treeviewMap.get(viewName);
  }

  public dispose() {
    this.treeviewMap.forEach((value) => {
      value.dispose();
    });
  }
}

export default TreeViewManager.getInstance();
