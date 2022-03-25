// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import { Result, FxError, TreeCategory } from "@microsoft/teamsfx-api";

import { ext } from "../extensionVariables";
import { localize } from "../utils/localizeUtils";

export enum CommandStatus {
  Ready,
  Running,
  Blocked,
}

const labelPrefix = "teamstoolkit.commandsTreeViewProvider.";

export class TreeViewCommand extends vscode.TreeItem {
  public static readonly TreeViewFlag = "TreeView";

  public children?: TreeViewCommand[];

  constructor(
    private readyLabel: string,
    private readyTooltip: string | vscode.MarkdownString,
    public commandId?: string,
    public callback?: (args?: unknown[]) => Promise<Result<unknown, FxError>>,
    public runningLabelKey?: string,
    public image?: { name: string; custom: boolean },
    public category?: TreeCategory
  ) {
    super(readyLabel, vscode.TreeItemCollapsibleState.None);

    this.setImagetoIcon();

    if (commandId) {
      this.command = {
        title: readyLabel,
        command: commandId,
        arguments: [TreeViewCommand.TreeViewFlag, this],
      };
    }
  }

  public setStatus(status: CommandStatus, blockedTooltip?: string) {
    switch (status) {
      case CommandStatus.Running:
        this.iconPath = new vscode.ThemeIcon("loading~spin");
        if (this.runningLabelKey) {
          const label = localize(`${labelPrefix}${this.runningLabelKey}Running`);
          if (label) {
            this.label = label;
          }
        }
        break;
      case CommandStatus.Blocked:
        if (blockedTooltip) {
          this.tooltip = blockedTooltip;
        }
        break;
      case CommandStatus.Ready:
      default:
        this.setImagetoIcon();
        this.label = this.readyLabel;
        this.tooltip = this.readyTooltip;
        break;
    }
  }

  public getBlockingTooltip(): string | undefined {
    if (this.runningLabelKey) {
      const tooltip = localize(`${labelPrefix}${this.runningLabelKey}BlockTooltip`);
      return tooltip;
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
