// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";
import { TeamsFxBotCommandHandler } from "./interface";
import { CommandResponseMiddleware } from "./middleware";

/**
 * A command bot for receiving commands and sending responses in Teams.
 *
 * @remarks
 * Only work on server side.
 */
export class CommandBot {
  private readonly adapter: BotFrameworkAdapter;
  private readonly middleware: CommandResponseMiddleware;

  /**
   * Creates a new instance of the `CommandBot`.
   *
   * @param adapter The bound `BotFrameworkAdapter`.
   * @param commands The commands to registered with the command bot. Each command should implement the interface {@link TeamsFxBotCommandHandler} so that it can be correctly handled by this command bot.
   */
  constructor(adapter: BotFrameworkAdapter, commands?: TeamsFxBotCommandHandler[]) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "CommandBot"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Registers a command into the command bot.
   *
   * @param command The command to registered.
   *
   * @remarks
   * Only work on server side.
   */
  public registerCommand(command: TeamsFxBotCommandHandler): void {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "CommandBot"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Registers commands into the command bot.
   *
   * @param commands The command to registered.
   *
   * @remarks
   * Only work on server side.
   */
  public registerCommands(commands: TeamsFxBotCommandHandler[]): void {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "CommandnBot"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
