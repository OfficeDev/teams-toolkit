// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../core/errors";
import { internalLogger } from "../util/logger";
import {
  CommandOptions,
  SsoConfig,
  SsoExecutionActivityHandler,
  TeamsFxBotCommandHandler,
  TeamsFxBotSsoCommandHandler,
} from "./interface";
import { CommandResponseMiddleware } from "./middlewares/commandMiddleware";

/**
 * A command bot for receiving commands and sending responses in Teams.
 *
 * @remarks
 * Ensure each command should ONLY be registered with the command once, otherwise it'll cause unexpected behavior if you register the same command more than once.
 */
export class CommandBot {
  private readonly adapter: BotFrameworkAdapter;
  private readonly middleware: CommandResponseMiddleware;
  private readonly ssoConfig: SsoConfig | undefined;

  /**
   * Creates a new instance of the `CommandBot`.
   *
   * @param adapter The bound `BotFrameworkAdapter`.
   * @param options - initialize options
   */
  constructor(
    adapter: BotFrameworkAdapter,
    options?: CommandOptions,
    ssoCommandActivityHandler?: SsoExecutionActivityHandler,
    ssoConfig?: SsoConfig
  ) {
    this.ssoConfig = ssoConfig;

    this.middleware = new CommandResponseMiddleware(
      options?.commands,
      options?.ssoCommands,
      ssoCommandActivityHandler
    );
    this.adapter = adapter.use(this.middleware);
  }

  /**
   * Registers a command into the command bot.
   *
   * @param command The command to register.
   */
  public registerCommand(command: TeamsFxBotCommandHandler): void {
    if (command) {
      this.middleware.commandHandlers.push(command);
    }
  }

  /**
   * Registers commands into the command bot.
   *
   * @param commands The commands to register.
   */
  public registerCommands(commands: TeamsFxBotCommandHandler[]): void {
    if (commands) {
      this.middleware.commandHandlers.push(...commands);
    }
  }

  /**
   * Registers a sso command into the command bot.
   *
   * @param command The command to register.
   */
  public registerSsoCommand(ssoCommand: TeamsFxBotSsoCommandHandler): void {
    if (!this.middleware.ssoActivityHandler) {
      internalLogger.error(ErrorMessage.SsoActivityHandlerIsNull);
      throw new ErrorWithCode(
        ErrorMessage.SsoActivityHandlerIsNull,
        ErrorCode.SsoActivityHandlerIsUndefined
      );
    }
    this.middleware.commandHandlers.push(ssoCommand);
    this.middleware.ssoActivityHandler?.addCommand(ssoCommand);
    this.middleware.hasSsoCommand = true;
  }

  /**
   * Registers commands into the command bot.
   *
   * @param commands The commands to register.
   */
  public registerSsoCommands(ssoCommands: TeamsFxBotSsoCommandHandler[]): void {
    if (ssoCommands.length > 0) {
      if (!this.middleware.ssoActivityHandler) {
        internalLogger.error(ErrorMessage.SsoActivityHandlerIsNull);
        throw new ErrorWithCode(
          ErrorMessage.SsoActivityHandlerIsNull,
          ErrorCode.SsoActivityHandlerIsUndefined
        );
      }
      for (const ssoCommand of ssoCommands) {
        this.middleware.ssoActivityHandler?.addCommand(ssoCommand);
      }
      this.middleware.commandHandlers.push(...ssoCommands);
      this.middleware.hasSsoCommand = true;
    }
  }
}
