// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { CommandBot } from "./command";
import { ConversationOptions } from "./interface";
import { NotificationBot } from "./notification";

/**
 * Provide utilities for bot conversation, including:
 *   - handle command and response.
 *   - send notification to varies targets (e.g., member, channel, incoming wehbook).
 *
 * @example
 * For command and response, you can register your commands through the constructor, or use the `registerCommand` and `registerCommands` API to add commands later.
 *
 * ```typescript
 * // register through constructor
 * const conversationBot = new ConversationBot({
 *   command: {
 *     enable: true,
 *     options: {
 *         commands: [ new HelloWorldCommandHandler() ],
 *     },
 *   },
 * });
 *
 * // register through `register*` API
 * conversationBot.command.registerCommand(new HelpCommandHandler());
 * ```
 *
 * For notification, you can enable notification at initialization, then send notificaations at any time.
 *
 * ```typescript
 * // enable through constructor
 * const conversationBot = new ConversationBot({
 *   notification: {
 *     enable: true,
 *   },
 * });
 *
 * // get all bot installations and send message
 * for (const target of await conversationBot.notification.installations()) {
 *   await target.sendMessage("Hello Notification");
 * }
 *
 * // alternative - send message to all members
 * for (const target of await conversationBot.notification.installations()) {
 *   for (const member of await target.members()) {
 *     await member.sendMessage("Hello Notification");
 *   }
 * }
 * ```
 *
 * @remarks
 * Set `adapter` in {@link ConversationOptions} to use your own bot adapter.
 *
 * For command and response, ensure each command should ONLY be registered with the command once, otherwise it'll cause unexpected behavior if you register the same command more than once.
 *
 * For notification, set `notification.options.storage` in {@link ConversationOptions} to use your own storage implementation.
 *
 * @beta
 */
export class ConversationBot {
  /**
   * The bot adapter.
   *
   * @beta
   */
  public readonly adapter: BotFrameworkAdapter;

  /**
   * The entrypoint of command and response.
   *
   * @beta
   */
  public readonly command?: CommandBot;

  /**
   * The entrypoint of notification.
   *
   * @beta
   */
  public readonly notification?: NotificationBot;

  /**
   * Creates new instance of the `ConversationBot`.
   *
   * @param options - initialize options
   *
   * @beta
   */
  public constructor(options: ConversationOptions) {
    if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      this.adapter = new BotFrameworkAdapter({
        appId: process.env.BOT_ID,
        appPassword: process.env.BOT_PASSWORD,
      });
    }

    if (options.command.enable) {
      this.command = new CommandBot(this.adapter, options.command.options);
    }

    if (options.notification.enable) {
      this.notification = new NotificationBot(this.adapter, options.notification.options);
    }
  }
}
