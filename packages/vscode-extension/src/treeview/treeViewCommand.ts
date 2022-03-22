// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import { TreeCategory } from "@microsoft/teamsfx-api";

import { ext } from "../extensionVariables";

export class TreeViewCommand extends vscode.TreeItem {
  public static readonly TreeViewFlag = "TreeView";

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
        arguments: [TreeViewCommand.TreeViewFlag, this],
      };
    }
  }
}
