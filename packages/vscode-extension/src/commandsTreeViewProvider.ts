// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { ext } from "./extensionVariables";
import { TreeItem, TreeCategory, Result, FxError, ok } from "fx-api";
import * as StringResources from "./resources/Strings.json";

class TreeViewManager{
  private static instance: TreeViewManager;
  private treeviewMap: Map<string, CommandsTreeViewProvider>;

  private constructor(){
    this.treeviewMap = new Map();
  }

  public static getInstance(){
    if(!TreeViewManager.instance){
      TreeViewManager.instance = new TreeViewManager();
    }
    return TreeViewManager.instance;
  }

  public registerTreeViews(){
    let disposables = [];

    const getStartTreeViewCommand = [
      new TreeViewCommand(StringResources.vsc.commandsTreeViewProvider.quickStartTitle, StringResources.vsc.commandsTreeViewProvider.quickStartDescription, "fx-extension.openWelcome", vscode.TreeItemCollapsibleState.None, TreeCategory.GettingStarted, undefined, "lightningBolt_16"),
      new TreeViewCommand(StringResources.vsc.commandsTreeViewProvider.samplesTitle, StringResources.vsc.commandsTreeViewProvider.samplesDescription, "fx-extension.openSamples", vscode.TreeItemCollapsibleState.None, TreeCategory.GettingStarted, undefined, "heart_16"),
      new TreeViewCommand(StringResources.vsc.commandsTreeViewProvider.documentationTitle, StringResources.vsc.commandsTreeViewProvider.documentationDescription, "fx-extension.openDocument", vscode.TreeItemCollapsibleState.None, TreeCategory.GettingStarted, undefined, "book_16")
    ];
    const getStartedProvider = new CommandsTreeViewProvider(getStartTreeViewCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-getting-started", getStartedProvider));

    const accountProvider = new CommandsTreeViewProvider([]);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-accounts", accountProvider));

    const projectTreeViewCommand = [
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.createProjectTitle,
        StringResources.vsc.commandsTreeViewProvider.createProjectDescription,
        "fx-extension.create",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "createProject"
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.manifestEditorTitle,
        StringResources.vsc.commandsTreeViewProvider.manifestEditorDescription,
        "fx-extension.openManifest",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "manifestEditor"
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.validateManifestTitle,
        StringResources.vsc.commandsTreeViewProvider.validateManifestDescription,
        "fx-extension.validateManifest",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "validatemanifest"
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.buildPackageTitle,
        StringResources.vsc.commandsTreeViewProvider.buildPackageDescription,
        "fx-extension.build",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "build"
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.provisionTitle,
        StringResources.vsc.commandsTreeViewProvider.provisionDescription,
        "fx-extension.provision",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "provision"
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.deployTitle,
        StringResources.vsc.commandsTreeViewProvider.deployDescription,
        "fx-extension.deploy",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "deploy"
      ),
      new TreeViewCommand(
        StringResources.vsc.commandsTreeViewProvider.publishTitle,
        StringResources.vsc.commandsTreeViewProvider.publishDescription,
        "fx-extension.publish",
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        "publish"
      )
    ];
    const projectProvider = new CommandsTreeViewProvider(projectTreeViewCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-project", projectProvider));

    const teamDevCenterTreeViewCommand = [
      new TreeViewCommand(StringResources.vsc.commandsTreeViewProvider.appManagementTitle, StringResources.vsc.commandsTreeViewProvider.appManagementDescription, "fx-extension.openAppManagement", vscode.TreeItemCollapsibleState.None, undefined, undefined, "appManagement"),
      new TreeViewCommand(StringResources.vsc.commandsTreeViewProvider.botManagementTitle, StringResources.vsc.commandsTreeViewProvider.botManagementDescription, "fx-extension.openBotManagement", vscode.TreeItemCollapsibleState.None, undefined, undefined, "bot"),
    ];
    const teamDevCenterProvider = new CommandsTreeViewProvider(teamDevCenterTreeViewCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-teams-dev-center", teamDevCenterProvider));

    const feedbackTreeViewCommand = [
      new TreeViewCommand(StringResources.vsc.commandsTreeViewProvider.reportIssuesTitle, StringResources.vsc.commandsTreeViewProvider.reportIssuesDescription, "fx-extension.openReportIssues", vscode.TreeItemCollapsibleState.None, TreeCategory.Feedback, undefined, "reportIssues"),
    ];
    const feedbackProvider = new CommandsTreeViewProvider(feedbackTreeViewCommand);
    disposables.push(vscode.window.registerTreeDataProvider("teamsfx-feedback", feedbackProvider));

    this.treeviewMap.set('teamsfx-getting-started', getStartedProvider);
    this.treeviewMap.set('teamsfx-accounts', accountProvider);
    this.treeviewMap.set('teamsfx-project', projectProvider);
    this.treeviewMap.set('teamsfx-teams-dev-center', teamDevCenterProvider);
    this.treeviewMap.set('teamsfx-feedback', feedbackProvider);

    return disposables;
  }

  public getTreeView(viewName: string){
    return this.treeviewMap.get(viewName);
  }

  public dispose(){
    this.treeviewMap.forEach((value) =>{value.dispose();});
  }
}

export default TreeViewManager.getInstance();

export class CommandsTreeViewProvider implements vscode.TreeDataProvider<TreeViewCommand> {
  public static readonly TreeViewFlag = "TreeView";
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeViewCommand | undefined | void
  > = new vscode.EventEmitter<TreeViewCommand | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeViewCommand | undefined | void> = this
    ._onDidChangeTreeData.event;

  private commands: TreeViewCommand[] = [];
  private disposableMap: Map<string, vscode.Disposable> = new Map();

  public constructor(commands: TreeViewCommand[]) {
    this.commands.push(...commands);
  }

  findCommand(commandId: string): TreeViewCommand | undefined {
    const commandStack: TreeViewCommand[] = [];
    for (const command of this.commands) {
      commandStack.push(command);
    }
    while (commandStack.length > 0) {
      const curCommand = commandStack.shift();
      if (curCommand?.commandId === commandId) {
        return curCommand;
      }
      if (curCommand?.children) {
        for (const subCommand of curCommand?.children) {
          commandStack.push(subCommand);
        }
      }
    }
    return undefined;
  }

  async isRegistered(commandId: string): Promise<boolean> {
    const target = this.disposableMap.get(commandId);
    if (target !== undefined) {
      return true;
    }
    return false;
  }

  async refresh(items: TreeItem[]): Promise<Result<null, FxError>> {
    for (const treeItem of items) {
      const originalCommand = this.findCommand(treeItem.commandId);
      if (originalCommand !== undefined) {
        originalCommand.label = treeItem.label;
        if (treeItem.tooltip) {
          if (treeItem.tooltip.isMarkdown) {
            const markdown = new vscode.MarkdownString(treeItem.tooltip.value);
            originalCommand.tooltip = markdown;
          } else {
            originalCommand.tooltip = treeItem.tooltip.value;
          }
        } else {
          originalCommand.tooltip = treeItem.label;
        }
        originalCommand.contextValue = treeItem.contextValue;
        if (treeItem.icon) {
          originalCommand.iconPath = path.join(ext.context.extensionPath, "media", `${treeItem.icon}.svg`);
        }
      }
    }
    this._onDidChangeTreeData.fire();
    return Promise.resolve(ok(null));
  }

  async add(items: TreeItem[]): Promise<Result<null, FxError>> {
    for (const treeItem of items) {
      if (this.disposableMap.get(treeItem.commandId) !== undefined) {
        continue;
      }

      const disposable = vscode.commands.registerCommand(treeItem.commandId, treeItem.callback!);
      this.disposableMap.set(treeItem.commandId, disposable);

      let tooltip: string | vscode.MarkdownString = treeItem.label;
      if (treeItem.tooltip) {
        if (treeItem.tooltip.isMarkdown) {
          const markdown = new vscode.MarkdownString(treeItem.tooltip.value);
          tooltip = markdown;
        } else {
          tooltip = treeItem.tooltip.value;
        }
      }

      const command = new TreeViewCommand(
        treeItem.label,
        tooltip,
        treeItem.commandId,
        treeItem.subTreeItems && treeItem.subTreeItems.length > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : undefined,
        typeof treeItem.parent === "number" ? (treeItem.parent as TreeCategory) : undefined,
        [],
        treeItem.icon,
        treeItem.contextValue
      );

      let parentCmd = undefined;
      if (typeof treeItem.parent === "number") {
        this.commands.push(command);
      } else {
        parentCmd = this.findCommand(treeItem.parent! as string);

        if (parentCmd) {
          parentCmd.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
          parentCmd.children?.push(command);
        }
      }

      if (parentCmd || typeof treeItem.parent === "number") {
        if (treeItem.subTreeItems) {
          for (const subTreeItem of treeItem.subTreeItems) {
            const registered = await this.isRegistered(subTreeItem.commandId);
            if (!registered && subTreeItem.callback !== undefined) {
              const disposable = vscode.commands.registerCommand(
                subTreeItem.commandId,
                subTreeItem.callback
              );
              this.disposableMap.set(subTreeItem.commandId, disposable);
            }
            const subCommand = new TreeViewCommand(
              subTreeItem.label,
              subTreeItem.label,
              subTreeItem.commandId,
              subTreeItem.subTreeItems && subTreeItem.subTreeItems.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : undefined
            );

            if (command.children === undefined) {
              command.children = [];
            }
            command.children?.push(subCommand);
          }
        }
      }
    }
    this._onDidChangeTreeData.fire();
    return Promise.resolve(ok(null));
  }

  remove(items: TreeItem[]): Promise<Result<null, FxError>> {
    for (const treeItem of items) {
      let parentCmd = undefined;
      if (typeof treeItem.parent === "number") {
        parentCmd = this.commands.find((rootCommand) => rootCommand.category === treeItem.parent);
      } else {
        parentCmd = this.findCommand(treeItem.parent! as string);
      }

      if (parentCmd && parentCmd.children) {
        for (let i = 0; i < parentCmd.children?.length; i++) {
          if (parentCmd.children[i].commandId === treeItem.commandId) {
            if (parentCmd.children.length === 1)
              parentCmd.collapsibleState = vscode.TreeItemCollapsibleState.None;

            const removeCmd = parentCmd.children.splice(i--, 1);
            const disposable = this.disposableMap.get(removeCmd[0].commandId!);
            disposable?.dispose();
            this.disposableMap.delete(removeCmd[0].commandId!);

            if (removeCmd[0].children) {
              for (const child of removeCmd[0].children) {
                const subDisposable = this.disposableMap.get(child.commandId!);
                subDisposable?.dispose();
                this.disposableMap.delete(child.commandId!);
              }
            }
          }
        }
      }
    }
    this._onDidChangeTreeData.fire();
    return Promise.resolve(ok(null));
  }

  getTreeItem(element: TreeViewCommand): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeViewCommand): Thenable<TreeViewCommand[]> {
    if (element && element.children) {
      return Promise.resolve(element.children);
    } else {
      return Promise.resolve(this.commands);
    }
  }

  dispose() {
    this.disposableMap.forEach((value) => {
      value.dispose();
    });
  }
}

export class TreeViewCommand extends vscode.TreeItem {
  constructor(
    public label: string,
    public tooltip: string | vscode.MarkdownString,
    public commandId?: string,
    public collapsibleState?: vscode.TreeItemCollapsibleState,
    public category?: TreeCategory,
    public children?: TreeViewCommand[],
    public imageName?: string,
    public contextValue?: string
  ) {
    super(label, collapsibleState ? collapsibleState : vscode.TreeItemCollapsibleState.None);
    this.description = "";
    this.contextValue = contextValue;

    if (imageName !== undefined) {
      this.iconPath = path.join(ext.context.extensionPath, "media", `${this.imageName}.svg`);
    }

    if (commandId) {
      this.command = {
        title: label,
        command: commandId,
        arguments: [this]
      };
    }
  }
}
