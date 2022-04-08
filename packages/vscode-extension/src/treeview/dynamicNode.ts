// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

export abstract class DynamicNode extends vscode.TreeItem {
  public abstract getChildren(): Promise<DynamicNode[] | undefined | null>;

  public abstract getTreeItem(): Promise<vscode.TreeItem>;
}
