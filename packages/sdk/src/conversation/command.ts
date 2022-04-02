// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { TeamsFxBotCommandHandler } from "./interface";
import { CommandResponseMiddleware } from "./middleware";

/**
 * A command bot for receiving commands and sending responses in Teams.
 *
 * @remarks
 * Ensure each command should ONLY be registered with the command once, otherwise it'll cause unexpected behavior if you register the same command more than once.
 *
 * @example
 * You can register your commands  through the constructor of the {@link CommandBot}, or use the `registerCommand` and `registerCommands` API to add commands after creating the `CommandBot` instance.
 *
 * ```typescript
 * // register through constructor
 * const commandBot = new CommandBot(adapter, [ new HelloWorldCommandHandler() ]);
 *
 * // register through `register*` API
 * commandBot.registerCommand(new HelpCommandHandler());
 * ```
 *
 * @beta
 */
export class CommandBot {
  public readonly adapter: BotFrameworkAdapter;
  private readonly middleware: CommandResponseMiddleware;

  /**
   * Creates a new instance of the `CommandBot`.
   *
   * @param adapter The bound `BotFrameworkAdapter`.
   * @param commands The commands to registered with the command bot. Each command should implement the interface {@link TeamsFxBotCommandHandler} so that it can be correctly handled by this command bot.
   *
   * @beta
   */
  constructor(adapter: BotFrameworkAdapter, commands?: TeamsFxBotCommandHandler[]) {
    this.middleware = new CommandResponseMiddleware(commands);
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
