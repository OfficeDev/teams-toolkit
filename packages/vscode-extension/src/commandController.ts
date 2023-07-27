// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { commands } from "vscode";

import { FxError, Result } from "@microsoft/teamsfx-api";

import treeViewManager from "./treeview/treeViewManager";
import { localize } from "./utils/localizeUtils";

type CommandHandler = (args?: unknown[]) => Promise<Result<unknown, FxError>>;

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

  public async runCommand(commandName: string, args: unknown[]) {
    const command = this.commandMap.get(commandName);
    if (command) {
      await command.callback(args);
    }
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
