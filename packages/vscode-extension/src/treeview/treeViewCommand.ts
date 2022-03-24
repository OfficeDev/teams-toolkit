// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import { Result, FxError, TreeCategory } from "@microsoft/teamsfx-api";

import { ext } from "../extensionVariables";

export class TreeViewCommand extends vscode.TreeItem {
  public static readonly TreeViewFlag = "TreeView";

  public children?: TreeViewCommand[];

  constructor(
    public label: string,
    public tooltip: string | vscode.MarkdownString,
    public commandId?: string,
    public image?: { name: string; custom: boolean },
    public category?: TreeCategory,
    public callback?: (args?: unknown[]) => Promise<Result<unknown, FxError>>
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.setImagetoIcon();

    if (commandId) {
      this.command = {
        title: label,
        command: commandId,
        arguments: [TreeViewCommand.TreeViewFlag, this],
      };
    }
  }

  public setStatus(running: boolean) {
    if (running) {
      this.iconPath = new vscode.ThemeIcon("loading~spin");
    } else {
      this.setImagetoIcon();
    }
  }

  private setImagetoIcon() {
    if (this.image !== undefined) {
      if (!this.image.custom) {
        this.iconPath = new vscode.ThemeIcon(this.image.name);
      } else {
        this.iconPath = {
          light: path.join(ext.context.extensionPath, "media", "light", `${this.image.name}.svg`),
          dark: path.join(ext.context.extensionPath, "media", "dark", `${this.image.name}.svg`),
        };
      }
    }
  }
}
