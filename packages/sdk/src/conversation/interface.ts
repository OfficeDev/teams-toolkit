// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { Activity, TurnContext } from "botbuilder-core";

/**
 * The target type where the notification will be sent to.
 *
 * @remarks
 * - "Channel" means to a team channel. (By default, notification to a team will be sent to its "General" channel.)
 * - "Group" means to a group chat.
 * - "Person" means to a personal chat.
 */
export type NotificationTargetType = "Channel" | "Group" | "Person";

/**
 * Represent a notification target.
 */
export interface NotificationTarget {
  /**
   * The type of target, could be "Channel" or "Group" or "Person".
   */
  readonly type?: NotificationTargetType;

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   */
  sendMessage(text: string): Promise<void>;

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   */
  sendAdaptiveCard(card: unknown): Promise<void>;
}

/**
 * Interface for a storage provider that stores and retrieves notification target references.
 */
export interface NotificationTargetStorage {
  /**
   * Read one notification target by its key.
   *
   * @param key - the key of a notification target.
   *
   * @returns - the notification target. Or undefined if not found.
   */
  read(key: string): Promise<{ [key: string]: unknown } | undefined>;

  /**
   * List all stored notification targets.
   *
   * @returns - an array of notification target. Or an empty array if nothing is stored.
   */
  list(): Promise<{ [key: string]: unknown }[]>;

  /**
   * Write one notification target by its key.
   *
   * @param key - the key of a notification target.
   * @param object - the notification target.
   */
  write(key: string, object: { [key: string]: unknown }): Promise<void>;

  /**
   * Delete one notification target by its key.
   *
   * @param key - the key of a notification target.
   */
  delete(key: string): Promise<void>;
}

/**
 * Options to initialize {@link NotificationBot}.
 */
export interface NotificationOptions {
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
   */
  storage?: NotificationTargetStorage;
}

/**
 * The trigger pattern used to trigger a {@link TeamsFxBotCommandHandler} instance.
 */
export type TriggerPatterns = string | RegExp | (string | RegExp)[];

/**
 * Interface for a command message that can handled in a command handler.
 */
export interface CommandMessage {
  /**
   * Text of the message sent by the user.
   */
  text: string;

  /**
   * The capture groups that matched to the {@link TriggerPatterns} in a {@link TeamsFxBotCommandHandler} instance.
   */
  matches?: RegExpMatchArray;
}

/**
 * Interface for a command handler that can process command to a TeamsFx bot and return a response.
 */
export interface TeamsFxBotCommandHandler {
  /**
   * The string or regular expression patterns that can trigger this handler.
   */
  triggerPatterns: TriggerPatterns;

  /**
   * Handles a bot command received activity.
   *
   * @param context The bot context.
   * @param message The command message the user types from Teams.
   * @returns A `Promise` representing an activity or text to send as the command response.
   * Or no return value if developers want to send the response activity by themselves in this method.
   */
  handleCommandReceived(
    context: TurnContext,
    message: CommandMessage
  ): Promise<string | Partial<Activity> | void>;
}

/**
 * Options to initialize {@link CommandBot}.
 */
export interface CommandOptions {
  /**
   * The commands to registered with the command bot. Each command should implement the interface {@link TeamsFxBotCommandHandler} so that it can be correctly handled by this command bot.
   */
  commands?: TeamsFxBotCommandHandler[];
}

/**
 * Options to initialize {@link ConversationBot}
 */
export interface ConversationOptions {
  /**
   * The bot adapter. If not provided, a default adapter will be created:
   * - with `adapterConfig` as constructor parameter.
   * - with a default error handler that logs error to console, sends trace activity, and sends error message to user.
   *
   * @remarks
   * If neither `adapter` nor `adapterConfig` is provided, will use BOT_ID and BOT_PASSWORD from environment variables.
   */
  adapter?: BotFrameworkAdapter;

  /**
   * If `adapter` is not provided, this `adapterConfig` will be passed to the new `BotFrameworkAdapter` when created internally.
   *
   * @remarks
   * If neither `adapter` nor `adapterConfig` is provided, will use BOT_ID and BOT_PASSWORD from environment variables.
   */
  adapterConfig?: { [key: string]: unknown };

  /**
   * The command part.
   */
  command?: CommandOptions & {
    /**
     * Whether to enable command or not.
     */
    enabled?: boolean;
  };

  /**
   * The notification part.
   */
  notification?: NotificationOptions & {
    /**
     * Whether to enable notification or not.
     */
    enabled?: boolean;
  };
}
