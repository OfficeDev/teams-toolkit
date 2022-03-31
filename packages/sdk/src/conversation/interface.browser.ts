// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, TurnContext } from "botbuilder";

/**
 * The target type where the notification will be sent to.
 *
 * @remarks
 * Only work on server side.
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
 * @remarks
 * Only work on server side.
 *
 * @beta
 */
export interface NotificationTarget {
  /**
   * The type of target, could be "Channel" or "Group" or "Person".
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  readonly type?: NotificationTargetType;

  /**
   * Send a plain text message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param text - the plain text message.
   *
   * @beta
   */
  sendMessage(text: string): Promise<void>;

  /**
   * Send an adaptive card message.
   *
   * @remarks
   * Only work on server side.
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
 * @remarks
 * Only work on server side.
 *
 * @beta
 */
export interface NotificationTargetStorage {
  /**
   * Read one notification target by its key.
   *
   * @remarks
   * Only work on server side.
   *
   * @param key - the key of a notification target.
   *
   * @returns - the notification target. Or undefined if not found.
   *
   * @beta
   */
  read(key: string): Promise<{ [key: string]: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any

  /**
   * List all stored notification targets.
   *
   * @remarks
   * Only work on server side.
   *
   * @returns - an array of notification target. Or an empty array if nothing is stored.
   *
   * @beta
   */
  list(): Promise<{ [key: string]: any }[]>; // eslint-disable-line @typescript-eslint/no-explicit-any

  /**
   * Write one notification target by its key.
   *
   * @remarks
   * Only work on server side.
   *
   * @param key - the key of a notification target.
   * @param object - the notification target.
   *
   * @beta
   */
  write(key: string, object: { [key: string]: any }): Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any

  /**
   * Deleta one notificaton target by its key.
   *
   * @remarks
   * Only work on server side.
   *
   * @param key - the key of a notification target.
   *
   * @beta
   */
  delete(key: string): Promise<void>;
}

/**
 * Interface for a command handler thar can process command to a TeamsFx bot and return a response.
 *
 * @remarks
 * Only work on server side.
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
