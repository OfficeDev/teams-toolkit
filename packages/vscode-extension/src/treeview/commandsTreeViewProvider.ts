// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { ext } from "../extensionVariables";
import { TreeItem, TreeCategory, Result, FxError, ok } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core";
import { Void } from "@microsoft/teamsfx-api";
export class CommandsTreeViewProvider implements vscode.TreeDataProvider<TreeViewCommand> {
  public static readonly TreeViewFlag = "TreeView";
  private _onDidChangeTreeData: vscode.EventEmitter<TreeViewCommand | undefined | void> =
    new vscode.EventEmitter<TreeViewCommand | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeViewCommand | undefined | void> =
    this._onDidChangeTreeData.event;

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

  removeCommand(commandId: string): undefined {
    for (let i = 0; i < this.commands.length; ++i) {
      const command = this.commands[i];
      if (command.commandId === commandId) {
        this.commands.splice(i, 1);
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
        }
        originalCommand.contextValue = treeItem.contextValue;
        if (treeItem.icon) {
          originalCommand.iconPath = {
            light: path.join(ext.context.extensionPath, "media", "light", `${treeItem.icon}.svg`),
            dark: path.join(ext.context.extensionPath, "media", "dark", `${treeItem.icon}.svg`),
          };
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

      const disposable = vscode.commands.registerCommand(treeItem.commandId, (...args) =>
        Correlator.run(treeItem.callback!, args)
      );
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
        (treeItem.subTreeItems && treeItem.subTreeItems.length > 0) || treeItem.expanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : undefined,
        typeof treeItem.parent === "number" ? (treeItem.parent as TreeCategory) : undefined,
        [],
        treeItem.icon
          ? {
              name: treeItem.icon,
              custom: treeItem.isCustom === undefined ? true : treeItem.isCustom,
            }
          : undefined,
        treeItem.contextValue,
        treeItem.description
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

            let tooltip: string | vscode.MarkdownString = subTreeItem.label;
            if (subTreeItem.tooltip) {
              if (subTreeItem.tooltip.isMarkdown) {
                const markdown = new vscode.MarkdownString(subTreeItem.tooltip.value);
                tooltip = markdown;
              } else {
                tooltip = subTreeItem.tooltip.value;
              }
            }

            const subCommand = new TreeViewCommand(
              subTreeItem.label,
              tooltip,
              subTreeItem.commandId,
              (subTreeItem.subTreeItems && subTreeItem.subTreeItems.length > 0) ||
              subTreeItem.expanded
                ? vscode.TreeItemCollapsibleState.Expanded
                : undefined,
              typeof subTreeItem.parent === "number"
                ? (subTreeItem.parent as TreeCategory)
                : undefined,
              [],
              subTreeItem.icon
                ? {
                    name: subTreeItem.icon,
                    custom: subTreeItem.isCustom === undefined ? true : subTreeItem.isCustom,
                  }
                : undefined,
              subTreeItem.contextValue,
              subTreeItem.description
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

  removeById(commandId: string): Result<Void, FxError> {
    const parentCmd = this.findCommand(commandId);

    if (parentCmd) {
      if (parentCmd.children) {
        for (let i = 0; i < parentCmd.children?.length; i++) {
          if (parentCmd.children.length === 1) {
            parentCmd.collapsibleState = vscode.TreeItemCollapsibleState.None;
          }

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

      const disposable = this.disposableMap.get(commandId);
      disposable?.dispose();
      this.disposableMap.delete(commandId);

      this.removeCommand(commandId);
    }

    this._onDidChangeTreeData.fire();
    return ok(Void);
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
    public image?: { name: string; custom: boolean },
    public contextValue?: string,
    public description?: string
  ) {
    super(label, collapsibleState ? collapsibleState : vscode.TreeItemCollapsibleState.None);
    this.description = description === undefined ? "" : description;
    this.contextValue = contextValue;

    if (image !== undefined) {
      if (!image.custom) {
        this.iconPath = new vscode.ThemeIcon(this.image!.name);
      } else {
        this.iconPath = {
          light: path.join(ext.context.extensionPath, "media", "light", `${this.image?.name}.svg`),
          dark: path.join(ext.context.extensionPath, "media", "dark", `${this.image?.name}.svg`),
        };
      }
    }

    if (commandId) {
      this.command = {
        title: label,
        command: commandId,
        arguments: [[CommandsTreeViewProvider.TreeViewFlag]],
      };
    }
  }
}
