// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { CommandOptions, TeamsFxBotCommandHandler } from "./interface";
import { CommandResponseMiddleware } from "./middleware";

/**
 * A command bot for receiving commands and sending responses in Teams.
 *
 * @remarks
 * Ensure each command should ONLY be registered with the command once, otherwise it'll cause unexpected behavior if you register the same command more than once.
 *
 * @beta
 */
export class CommandBot {
  private readonly adapter: BotFrameworkAdapter;
  private readonly middleware: CommandResponseMiddleware;

  /**
   * Creates a new instance of the `CommandBot`.
   *
   * @param adapter The bound `BotFrameworkAdapter`.
   * @param options - initialize options
   *
   * @beta
   */
  constructor(adapter: BotFrameworkAdapter, options?: CommandOptions) {
    this.middleware = new CommandResponseMiddleware(options?.commands);
    this.adapter = adapter.use(this.middleware);
  }

  /**
   * Registers a command into the command bot.
   *
   * @param command The command to registered.
   *
   * @beta
   */
  public registerCommand(command: TeamsFxBotCommandHandler): void {
    if (command) {
      this.middleware.commandHandlers.push(command);
    }
  }

  /**
   * Registers commands into the command bot.
   *
   * @param commands The command to registered.
   *
   * @beta
   */
  public registerCommands(commands: TeamsFxBotCommandHandler[]): void {
    if (commands) {
      this.middleware.commandHandlers.push(...commands);
    }
  }
}
