// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { localize } from "../utils/localizeUtils";
import { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { TreeViewCommand } from "./treeViewCommand";

class OfficeDevTreeViewManager {
  private static instance: OfficeDevTreeViewManager;
  private commandMap: Map<string, TreeViewCommand>;

  private treeviewMap: Map<string, any>;

  private constructor() {
    this.treeviewMap = new Map();
    this.commandMap = new Map<string, TreeViewCommand>();
  }

  public static getInstance() {
    if (!OfficeDevTreeViewManager.instance) {
      OfficeDevTreeViewManager.instance = new OfficeDevTreeViewManager();
    }
    return OfficeDevTreeViewManager.instance;
  }

  public dispose() {
    this.treeviewMap.forEach((value) => {
      (value as vscode.Disposable).dispose();
    });
  }

  public getTreeView(viewName: string): unknown {
    return this.treeviewMap.get(viewName);
  }

  public registerOfficeDevTreeViews(context: vscode.ExtensionContext): void {
    const disposables: vscode.Disposable[] = [];

    this.registerOfficeDevTreeViewItems(
      disposables,
      "teamsfx-officedev-development",
      this.getOfficeDevelopmentCommands
    );
    this.registerOfficeDevTreeViewItems(
      disposables,
      "teamsfx-officedev-lifecycle",
      this.getOfficeLifecycleCommands
    );
    this.registerOfficeDevTreeViewItems(
      disposables,
      "teamsfx-officedev-utility",
      this.getOfficeUtilityCommands
    );
    this.registerOfficeDevTreeViewItems(
      disposables,
      "teamsfx-officedev-help-and-feedback",
      this.getOfficeHelperCommands
    );

    context.subscriptions.push(...disposables);
  }

  private registerOfficeDevTreeViewItems(
    disposables: vscode.Disposable[],
    treeViewId: string,
    getCommandsFunc: () => TreeViewCommand[]
  ) {
    const commands = getCommandsFunc();
    const provider = new CommandsTreeViewProvider(commands);
    disposables.push(vscode.window.registerTreeDataProvider(treeViewId, provider));
    this.storeCommandsIntoMap(commands);
    this.treeviewMap.set(treeViewId, provider);
  }

  private getOfficeDevelopmentCommands(): TreeViewCommand[] {
    return [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.createOfficeAddInTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.createOfficeAddInDescription"),
        "fx-extension.create",
        undefined,
        { name: "new-folder", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.samplesTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.samplesDescription"),
        "fx-extension.openSamples",
        undefined,
        { name: "library", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.checkAndInstallDependenciesTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.checkAndInstallDependenciesDescription"),
        "fx-extension.installDependency",
        undefined,
        { name: "check-all", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.officeDevLocalDebugTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.officeDevLocalDebugDescription"),
        "fx-extension.localdebug",
        undefined,
        { name: "debug-alt", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.stopDebugTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.stopDebugDescription"),
        "fx-extension.stopDebugging",
        undefined,
        { name: "debug-stop", custom: false }
      ),
    ];
  }

  private getOfficeLifecycleCommands(): TreeViewCommand[] {
    return [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.officeDevDeployTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.officeDevDeployDescription"),
        "fx-extension.officeDevDeploy",
        undefined,
        { name: "cloud-upload", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.publishAppSourceTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.publishAppSourceDescription"),
        "fx-extension.publishToAppSource",
        undefined,
        { name: "teamsfx-developer-portal", custom: false }
      ),
    ];
  }

  private getOfficeUtilityCommands(): TreeViewCommand[] {
    const officeUtilityCommands = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.validateManifestTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.validateManifestDescription"),
        "fx-extension.validateApplication",
        undefined,
        {
          name: "beaker",
          custom: false,
        }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.scriptLabTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.scriptLabDescription"),
        "fx-extension.openSciptLabLink",
        undefined,
        {
          name: "symbol-function",
          custom: false,
        }
      ),
    ];

    return officeUtilityCommands;
  }

  private getOfficeHelperCommands(): TreeViewCommand[] {
    const helpCommand = [
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.documentationTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.documentationDescription"),
        "fx-extension.openOfficeDevDocument",
        undefined,
        { name: "book", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.getStartedTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.getStartedDescription"),
        "fx-extension.openGetStarted",
        undefined,
        { name: "symbol-event", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.officeAddIn.officePartnerCenterTitle"),
        localize(
          "teamstoolkit.commandsTreeViewProvider.officeAddIn.officePartnerCenterDescription"
        ),
        "fx-extension.officePartnerCenter",
        undefined,
        { name: "unfold", custom: false }
      ),
      new TreeViewCommand(
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesTitle"),
        localize("teamstoolkit.commandsTreeViewProvider.reportIssuesDescription"),
        "fx-extension.openOfficeDevReportIssues",
        undefined,
        { name: "github", custom: false }
      ),
    ];

    return helpCommand;
  }

  private storeCommandsIntoMap(commands: TreeViewCommand[]) {
    for (const command of commands) {
      if (command.commandId) {
        this.commandMap.set(command.commandId, command);
      }
    }
  }
}

export default OfficeDevTreeViewManager.getInstance();
