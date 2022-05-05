// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { TreeViewCommand } from "./treeViewCommand";

export class CommandsTreeViewProvider implements vscode.TreeDataProvider<TreeViewCommand> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeViewCommand | undefined | void> =
    new vscode.EventEmitter<TreeViewCommand | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeViewCommand | undefined | void> =
    this._onDidChangeTreeData.event;

  private commands: TreeViewCommand[] = [];
  private disposableMap: Map<string, vscode.Disposable> = new Map();

  public constructor(commands: TreeViewCommand[]) {
    this.commands.push(...commands);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
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
