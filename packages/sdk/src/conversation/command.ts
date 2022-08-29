// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import {
  CommandOptions,
  SsoConfig,
  SsoExecutionActivityHandler,
  TeamsFxBotCommandHandler,
  TeamsFxBotSsoCommandHandler,
} from "./interface";
import { CommandResponseMiddleware } from "./middlewares/commandMiddleware";
import { DefaultSsoExecutionActivityHandler } from "./sso/defaultSsoExecutionActivityHandler";

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
  constructor(adapter: BotFrameworkAdapter, options?: CommandOptions) {
    let ssoCommandActivityHandler: SsoExecutionActivityHandler | undefined;
    if (options?.ssoConfig?.CustomSsoExecutionActivityHandler) {
      ssoCommandActivityHandler = new options.ssoConfig.CustomSsoExecutionActivityHandler(
        options?.ssoConfig
      );
    } else if (options?.ssoCommands?.length && options?.ssoCommands?.length > 0) {
      ssoCommandActivityHandler = new DefaultSsoExecutionActivityHandler(options?.ssoConfig);
    }

    this.ssoConfig = options?.ssoConfig;

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
   * @param command The command to registered.
   */
  public registerCommand(command: TeamsFxBotCommandHandler): void {
    if (command) {
      this.middleware.commandHandlers.push(command);
    }
  }

  /**
   * Registers commands into the command bot.
   *
   * @param commands The commands to registered.
   */
  public registerCommands(commands: TeamsFxBotCommandHandler[]): void {
    if (commands) {
      this.middleware.commandHandlers.push(...commands);
    }
  }

  /**
   * Registers a sso command into the command bot.
   *
   * @param command The command to registered.
   */
  public registerSsoCommand(ssoCommand: TeamsFxBotSsoCommandHandler): void {
    if (ssoCommand) {
      if (!this.middleware.getActivityHandler()) {
        this.middleware.setActivityHandler(new DefaultSsoExecutionActivityHandler(this.ssoConfig));
      }
      this.middleware.commandHandlers.push(ssoCommand);
      this.middleware.activityHandler?.addCommand(ssoCommand);
    }
  }

  /**
   * Registers commands into the command bot.
   *
   * @param commands The commands to registered.
   */
  public registerSsoCommands(ssoCommands: TeamsFxBotSsoCommandHandler[]): void {
    if (ssoCommands) {
      if (!this.middleware.getActivityHandler()) {
        this.middleware.setActivityHandler(new DefaultSsoExecutionActivityHandler(this.ssoConfig));
      }
      for (const ssoCommand of ssoCommands) {
        this.middleware.activityHandler?.addCommand(ssoCommand);
      }
      this.middleware.commandHandlers.push(...ssoCommands);
    }
  }
}
