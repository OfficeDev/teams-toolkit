import * as vscode from "vscode";
import { exp } from "../exp";
import { TreatmentVariables } from "../exp/treatmentVariables";
import { CommandsWebviewProvider } from "./commandsWebviewProvider";
import { TreeContainerType } from "./treeContainerType";
import * as StringResources from "../resources/Strings.json";
import { CommandsTreeViewProvider, TreeViewCommand } from "./commandsTreeViewProvider";
import { TreeCategory } from "@microsoft/teamsfx-api";
import { AdaptiveCardCodeLensProvider } from "../codeLensProvider";

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

  public async registerTreeViews() {
    const disposables = [];

    const accountProvider = new CommandsTreeViewProvider([]);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-accounts", accountProvider));

    const environmentProvider = new CommandsTreeViewProvider([]);
    disposables.push(
      vscode.window.registerTreeDataProvider("teamsfx-environment", environmentProvider)
    );

    const developmentCommand = [
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.createProjectTitleNew,
        StringResources.vsc.commandsTreeViewProvider.createProjectDescription,
        "fx-extension.create",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "new-folder", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.samplesTitleNew,
        StringResources.vsc.commandsTreeViewProvider.samplesDescription,
        "fx-extension.openSamples",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "library", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.addCapabilitiesTitleNew,
        StringResources.vsc.commandsTreeViewProvider.addCapabilitiesDescription,
        "fx-extension.addCapability",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "addCapability", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.addResourcesTitleNew,
        StringResources.vsc.commandsTreeViewProvider.addResourcesDescription,
        "fx-extension.update",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "addResources", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.manifestEditorTitleNew,
        StringResources.vsc.commandsTreeViewProvider.manifestEditorDescription,
        "fx-extension.openManifest",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "edit", custom: false }
      ),
    ];

    if (await AdaptiveCardCodeLensProvider.detectedAdaptiveCards()) {
      developmentCommand.push(
        new TreeViewCommand(
          StringResources.vsc.commandsTreeViewProvider.previewAdaptiveCard,
          StringResources.vsc.commandsTreeViewProvider.previewACDesciption,
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
        StringResources.vsc.commandsTreeViewProvider.provisionTitleNew,
        StringResources.vsc.commandsTreeViewProvider.provisionDescription,
        "fx-extension.provision",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "type-hierarchy", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.validateManifestTitleNew,
        StringResources.vsc.commandsTreeViewProvider.validateManifestDescription,
        "fx-extension.validateManifest",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "checklist", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.buildPackageTitleNew,
        StringResources.vsc.commandsTreeViewProvider.buildPackageDescription,
        "fx-extension.build",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "package", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.deployTitle,
        StringResources.vsc.commandsTreeViewProvider.deployDescription,
        "fx-extension.deploy",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "cloud-upload", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.publishTitle,
        StringResources.vsc.commandsTreeViewProvider.publishDescription,
        "fx-extension.publish",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "publish", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.teamsDevPortalTitleNew,
        StringResources.vsc.commandsTreeViewProvider.teamsDevPortalDescription,
        "fx-extension.openAppManagement",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "developerPortal", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.cicdGuideTitle,
        StringResources.vsc.commandsTreeViewProvider.cicdGuideDescription,
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
        StringResources.vsc.commandsTreeViewProvider.quickStartTitle,
        StringResources.vsc.commandsTreeViewProvider.quickStartDescription,
        "fx-extension.openWelcome",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "lightningBolt_16", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.documentationTitle,
        StringResources.vsc.commandsTreeViewProvider.documentationDescription,
        "fx-extension.openDocument",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "book", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.reportIssuesTitleNew,
        StringResources.vsc.commandsTreeViewProvider.reportIssuesDescription,
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
        StringResources.vsc.commandsTreeViewProvider.createProjectTitleNew,
        StringResources.vsc.commandsTreeViewProvider.createProjectDescription,
        "fx-extension.create",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "new-folder", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.samplesTitleNew,
        StringResources.vsc.commandsTreeViewProvider.samplesDescription,
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
        StringResources.vsc.commandsTreeViewProvider.teamsDevPortalTitleNew,
        StringResources.vsc.commandsTreeViewProvider.teamsDevPortalDescription,
        "fx-extension.openAppManagement",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        { name: "developerPortal", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.cicdGuideTitle,
        StringResources.vsc.commandsTreeViewProvider.cicdGuideDescription,
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
        StringResources.vsc.commandsTreeViewProvider.quickStartTitle,
        StringResources.vsc.commandsTreeViewProvider.quickStartDescription,
        "fx-extension.openWelcome",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "lightningBolt_16", custom: true }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.documentationTitle,
        StringResources.vsc.commandsTreeViewProvider.documentationDescription,
        "fx-extension.openDocument",
        vscode.TreeItemCollapsibleState.None,
        TreeCategory.GettingStarted,
        undefined,
        { name: "book", custom: false }
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.reportIssuesTitleNew,
        StringResources.vsc.commandsTreeViewProvider.reportIssuesDescription,
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
