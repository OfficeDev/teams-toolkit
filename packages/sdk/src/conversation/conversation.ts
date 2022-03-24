// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter, TeamsInfo } from "botbuilder";
import * as path from "path";
import { NotificationTargetStorage, TeamsFxBotCommandHandler } from "./interface";
import { CommandResponseMiddleware, NotificationMiddleware } from "./middleware";
import { TeamsBotInstallation } from "./notification";
import { ConversationReferenceStore, LocalFileStorage } from "./storage";

/**
 * Options to initialize {@link ConversationBot}.
 *
 * @beta
 */
export interface ConversationOptions {
  /**
   * A boolean, controlling whether to whether to include the notification feature.
   * @defaultValue false
   * (default: `false`).
   */
  enableNotification?: boolean;

  /**
   * An optional storage to persist bot notification connections.
   *
   * @remarks
   * If `storage` is not provided, a default local file storage will be used,
   * which stores notification connections into:
   *   - ".notification.localstore.json" if running locally
   *   - "${process.env.TEMP}/.notification.localstore.json" if `process.env.RUNNING_ON_AZURE` is set to "1"
   *
   * It's recommended to use your own shared storage for production environment.
   *
   * @beta
   */
  storage?: NotificationTargetStorage;

  /**
   * The command handlers to register with the underlying conversation bot that
   * can process a command and return a response.
   *
   * @remarks
   * If provided, the corresponding handler will be involked if the bot received a message
   * that matches the command pattern (`string` or `RegExp`) defined in the handler.
   */
  commandHandlers?: TeamsFxBotCommandHandler[];
}

/**
 * Provide static utilities for bot conversation, including
 * - send notification to varies targets (e.g., member, channel, incoming wehbook)
 * - handle command and response.
 *
 * @example
 * Here's an example on how to send notification via Teams Bot.
 * ```typescript
 * // initialize (it's recommended to be called before handling any bot message)
 * ConversationBot.initialize(adapter, {
 *    enableNotification: true
 * });
 *
 * // get all bot installations and send message
 * for (const target of await ConversationBot.installations()) {
 *   await target.sendMessage("Hello Notification");
 * }
 *
 * // alternative - send message to all members
 * for (const target of await ConversationBot.installations()) {
 *   for (const member of await target.members()) {
 *     await member.sendMessage("Hello Notification");
 *   }
 * }
 * ```
 *
 * @beta
 */
export class ConversationBot {
  private static conversationReferenceStore: ConversationReferenceStore;
  private static adapter: BotFrameworkAdapter;

  /**
   * Initialize bot notification.
   *
   * @remarks
   * To ensure accuracy, it's recommended to initialize before handling any message.
   *
   * @param adapter - the bound `BotFrameworkAdapter`
   * @param options - initialize options
   *
   * @beta
   */
  public static initialize(adapter: BotFrameworkAdapter, options?: ConversationOptions) {
    const storage =
      options?.storage ??
      new LocalFileStorage(
        path.resolve(process.env.RUNNING_ON_AZURE === "1" ? process.env.TEMP ?? "./" : "./")
      );

    ConversationBot.adapter = adapter;
    if (options?.enableNotification) {
      ConversationBot.conversationReferenceStore = new ConversationReferenceStore(storage);
      ConversationBot.adapter = adapter.use(
        new NotificationMiddleware({
          conversationReferenceStore: ConversationBot.conversationReferenceStore,
        })
      );
    }

    if (options?.commandHandlers) {
      ConversationBot.adapter = adapter.use(new CommandResponseMiddleware(options.commandHandlers));
    }
  }

  /**
   * Get all targets where the bot is installed.
   *
   * @remarks
   * The result is retrieving from the persisted storage.
   *
   * @returns - an array of {@link TeamsBotInstallation}.
   *
   * @beta
   */
  public static async installations(): Promise<TeamsBotInstallation[]> {
    if (
      ConversationBot.conversationReferenceStore === undefined ||
      ConversationBot.adapter === undefined
    ) {
      throw new Error("ConversationBot has not been initialized.");
    }

    const references = (await ConversationBot.conversationReferenceStore.getAll()).values();
    const targets: TeamsBotInstallation[] = [];
    for (const reference of references) {
      // validate connection
      let valid = true;
      ConversationBot.adapter.continueConversation(reference, async (context) => {
        try {
          // try get member to see if the installation is still valid
          await TeamsInfo.getPagedMembers(context, 1);
        } catch (error: any) {
          if ((error.code as string) === "BotNotInConversationRoster") {
            valid = false;
          }
        }
      });

      if (valid) {
        targets.push(new TeamsBotInstallation(ConversationBot.adapter, reference));
      } else {
        ConversationBot.conversationReferenceStore.delete(reference);
      }
    }

    return targets;
  }
}
