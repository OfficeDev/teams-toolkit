// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

export abstract class DynamicNode extends vscode.TreeItem {
  public abstract getChildren(): vscode.ProviderResult<DynamicNode[]>;

  public abstract getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem>;
}
