// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, TurnContext } from "botbuilder-core";

/**
 * The target type where the notification will be sent to.
 *
 * @remarks
 * - "Channel" means to a team channel. (By default, notification to a team will be sent to its "General" channel.)
 * - "Group" means to a group chat.
 * - "Person" means to a personal chat.
 *
 * @beta
 */
export type NotificationTargetType = "Channel" | "Group" | "Person";

/**
 * Represent a notification target.
 *
 * @beta
 */
export interface NotificationTarget {
  /**
   * The type of target, could be "Channel" or "Group" or "Person".
   *
   * @beta
   */
  readonly type?: NotificationTargetType;

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   *
   * @beta
   */
  sendMessage(text: string): Promise<void>;

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   *
   * @beta
   */
  sendAdaptiveCard(card: unknown): Promise<void>;
}

/**
 * Interface for a storage provider that stores and retrieves notification target references.
 *
 * @beta
 */
export interface NotificationTargetStorage {
  /**
   * Read one notification target by its key.
   *
   * @param key - the key of a notification target.
   *
   * @returns - the notification target. Or undefined if not found.
   *
   * @beta
   */
  read(key: string): Promise<{ [key: string]: unknown } | undefined>;

  /**
   * List all stored notification targets.
   *
   * @returns - an array of notification target. Or an empty array if nothing is stored.
   *
   * @beta
   */
  list(): Promise<{ [key: string]: unknown }[]>;

  /**
   * Write one notification target by its key.
   *
   * @param key - the key of a notification target.
   * @param object - the notification target.
   *
   * @beta
   */
  write(key: string, object: { [key: string]: unknown }): Promise<void>;

  /**
   * Delete one notificaton target by its key.
   *
   * @param key - the key of a notification target.
   *
   * @beta
   */
  delete(key: string): Promise<void>;
}

/**
 * Options to initialize {@link NotificationBot}.
 *
 * @beta
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
   *
   * @beta
   */
  storage?: NotificationTargetStorage;
}

/**
 * Interface for a command handler that can process command to a TeamsFx bot and return a response.
 *
 * @beta
 */
export interface TeamsFxBotCommandHandler {
  /**
   * The command name or RegExp pattern that can trigger this handler.
   */
  commandNameOrPattern: string | RegExp;

  /**
   * Handles a bot command received activity.
   *
   * @param context The bot context.
   * @param receivedText The command text the user types from Teams.
   * @returns A `Promise` representing an activity or text to send as the command response.
   */
  handleCommandReceived(
    context: TurnContext,
    receivedText: string
  ): Promise<string | Partial<Activity>>;
}
