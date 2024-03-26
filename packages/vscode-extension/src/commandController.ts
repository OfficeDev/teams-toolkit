// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { commands } from "vscode";

import { FxError, Result, ok } from "@microsoft/teamsfx-api";

import {
  emptyProjectStatus,
  getProjectStatus,
  saveProjectStatus,
} from "./chat/commands/nextstep/status";
import { NecessaryActions } from "./chat/commands/nextstep/types";
import { workspaceUri } from "./globalVariables";
import treeViewManager from "./treeview/treeViewManager";
import { localize } from "./utils/localizeUtils";
import { getFixedCommonProjectSettings } from "@microsoft/teamsfx-core";

type CommandHandler = (...args: unknown[]) => Promise<Result<unknown, FxError>>;

interface TeamsFxCommand {
  name: string;
  callback: CommandHandler;
  blockTooltip?: string;
}

class CommandController {
  private static instance: CommandController;

  private commandMap: Map<string, TeamsFxCommand>;
  // mapping between fx-core API and vscode command
  private commandNameMap: Map<string, string>;
  private exclusiveCommands: Set<string>;

  private constructor() {
    this.commandMap = new Map<string, TeamsFxCommand>();
    this.exclusiveCommands = new Set([
      "fx-extension.addEnvironment",
      "fx-extension.build",
      "fx-extension.create",
      "fx-extension.deploy",
      "fx-extension.manageCollaborator",
      "fx-extension.openFromTdp",
      "fx-extension.provision",
      "fx-extension.publish",
      "fx-extension.publishInDeveloperPortal",
    ]);
    this.commandNameMap = new Map<string, string>([
      ["create", "fx-extension.create"],
      ["createEnv", "fx-extension.addEnvironment"],
      ["deployArtifacts", "fx-extension.deploy"],
      ["executeUserTask buildPackage", "fx-extension.build"],
      ["grantPermission", "fx-extension.manageCollaborator"],
      ["listCollaborator", "fx-extension.manageCollaborator"],
      ["provisionResources", "fx-extension.provision"],
      ["publishApplication", "fx-extension.publish"],
      ["publishInDeveloperPortal", "fx-extension.publishInDeveloperPortal"],
    ]);
  }

  public static getInstance() {
    if (!CommandController.instance) {
      CommandController.instance = new CommandController();
    }
    return CommandController.instance;
  }

  public registerCommand(
    commandName: string,
    commandHandler: CommandHandler,
    runningLabelKey?: string
  ) {
    let blockTooltip = "";
    if (runningLabelKey) {
      blockTooltip = localize(
        `teamstoolkit.commandsTreeViewProvider.${runningLabelKey}.blockTooltip`
      );
    }
    this.commandMap.set(commandName, {
      name: commandName,
      callback: commandHandler,
      blockTooltip,
    });
  }

  public async runCommand(commandName: string, ...args: unknown[]) {
    const command = this.commandMap.get(commandName);
    if (command) {
      const result = await command.callback(...args);
      const projectSettings = getFixedCommonProjectSettings(workspaceUri?.fsPath);
      const p = projectSettings?.projectId ?? workspaceUri?.fsPath;
      const actions = NecessaryActions.map((x) => x.toString());
      if (p && actions.includes(commandName)) {
        /// save project action running status
        const status = (await getProjectStatus(p)) ?? emptyProjectStatus();
        await saveProjectStatus(p, {
          ...status,
          [commandName]: {
            result: result.isOk() ? "success" : "fail",
            time: new Date(),
          },
        });
      }
      return result;
    }
    return ok<unknown, FxError>(undefined);
  }

  public async lockedByOperation(operation: string) {
    await commands.executeCommand("setContext", "fx-extension.commandLocked", true);
    const commandName = this.commandNameMap.get(operation);
    if (commandName) {
      const command = this.commandMap.get(commandName);
      const blockedCommands = [...this.exclusiveCommands.values()].filter((x) => x !== commandName);
      treeViewManager.setRunningCommand(commandName, blockedCommands, command?.blockTooltip);
    }
  }

  public async unlockedByOperation(operation: string) {
    await commands.executeCommand("setContext", "fx-extension.commandLocked", false);
    const commandName = this.commandNameMap.get(operation);
    if (commandName) {
      const blockedCommands = [...this.exclusiveCommands.values()].filter((x) => x !== commandName);
      treeViewManager.restoreRunningCommand(blockedCommands);
    }
  }

  public dispose() {}
}

export default CommandController.getInstance();
