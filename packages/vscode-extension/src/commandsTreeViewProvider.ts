// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { ext } from "./extensionVariables";
import { TreeItem, TreeCategory, Result, FxError, ok } from "fx-api";
import { isFeatureFlag } from "./utils/commonUtils";

export class CommandsTreeViewProvider implements vscode.TreeDataProvider<TreeViewCommand> {
  public static readonly TreeViewFlag = "TreeView";
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeViewCommand | undefined | void
  > = new vscode.EventEmitter<TreeViewCommand | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeViewCommand | undefined | void> = this
    ._onDidChangeTreeData.event;

  private static instance: CommandsTreeViewProvider;
  private commands: TreeViewCommand[] = [];
  private disposableMap: Map<string, vscode.Disposable> = new Map();

  private constructor() {
    const getStartTreeViewCommand = new TreeViewCommand(
      "GETTING STARTED",
      "Get started with Teamsfx",
      undefined,
      vscode.TreeItemCollapsibleState.Expanded,
      TreeCategory.GettingStarted,
      [
        new TreeViewCommand("Quick Start", "Quick Start", "fx-extension.openWelcome", vscode.TreeItemCollapsibleState.None, TreeCategory.GettingStarted, undefined, "lightningBolt_16"),
        new TreeViewCommand("Samples", "Samples", "fx-extension.openSamples", vscode.TreeItemCollapsibleState.None, TreeCategory.GettingStarted, undefined, "heart_16"),
        new TreeViewCommand("Documentation", "Documentation", "fx-extension.openDocument", vscode.TreeItemCollapsibleState.None, TreeCategory.GettingStarted, undefined, "book_16")
      ]
    );

    const accountTreeViewCommand = new TreeViewCommand(
      "ACCOUNT",
      "Your account list",
      undefined,
      vscode.TreeItemCollapsibleState.Expanded,
      TreeCategory.Account,
      [
        new TreeViewCommand(
          "Sign Up for M365 Dev Account",
          "Go to M365 developer program to try",
          "fx-extension.devProgram"
        )
      ]
    );

    const projectTreeViewCommand = new TreeViewCommand(
      "PROJECT",
      "Manage your project",
      undefined,
      vscode.TreeItemCollapsibleState.Expanded,
      TreeCategory.Project,
      [
        new TreeViewCommand(
          "Create New Project",
          "Create a new Project for Teams App",
          "fx-extension.create",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          "createProject"
        ),
        new TreeViewCommand(
          "Manifest Editor",
          "Manifest Editor",
          "fx-extension.openManifest",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          "manifestEditor"
        ),
        new TreeViewCommand(
          "Provision",
          "Provision resources",
          "fx-extension.provision",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          "provision"
        ),
        new TreeViewCommand(
          "Deploy",
          "Deploy resources",
          "fx-extension.deploy",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          "deploy"
        ),
        new TreeViewCommand(
          "Publish to Teams",
          "Publish to Teams",
          "fx-extension.publish",
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          "publish"
        )
      ]
    );

    const feedbackTreeViewCommand = new TreeViewCommand(
      "FEEDBACK",
      "Please send feedback to us if you meet any problems",
      undefined,
      vscode.TreeItemCollapsibleState.Expanded,
      TreeCategory.Feedback,
      [
        new TreeViewCommand(
          "Report issues",
          "Report issue to us by email",
          "fx-extension.mailto"
        )
      ]
    );

    this.commands.push(getStartTreeViewCommand);
    this.commands.push(accountTreeViewCommand);
    this.commands.push(feedbackTreeViewCommand);

    if (isFeatureFlag()) {
      this.commands.push(projectTreeViewCommand);
    }
  }

  public static getInstance(): CommandsTreeViewProvider {
    if (!this.instance) {
      this.instance = new CommandsTreeViewProvider();
    }
    return this.instance;
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
        originalCommand.tooltip = treeItem.label;
        originalCommand.contextValue = treeItem.contextValue;
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

      const command = new TreeViewCommand(
        treeItem.label,
        treeItem.label,
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
        parentCmd = this.commands.find((rootCommand) => rootCommand.category === treeItem.parent);
      } else {
        parentCmd = this.findCommand(treeItem.parent! as string);
      }

      if (parentCmd) {
        parentCmd.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        parentCmd.children?.push(command);
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
    public tooltip: string,
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
