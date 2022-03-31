// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  BotFrameworkAdapter,
  ChannelInfo,
  ConversationReference,
  TeamsChannelAccount,
} from "botbuilder";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";
import { NotificationTarget, NotificationTargetType } from "./interface";

/**
 * Send a plain text message to a notification target.
 *
 * @remarks
 * Only work on server side.
 *
 * @param target - the notification target.
 * @param text - the plain text message.
 * @returns A `Promise` representing the asynchronous operation.
 *
 * @beta
 */
export function sendMessage(target: NotificationTarget, text: string): Promise<void> {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "sendMessage"),
    ErrorCode.RuntimeNotSupported
  );
}

/**
 * Send an adaptive card message to a notification target.
 *
 * @remarks
 * Only work on server side.
 *
 * @param target - the notification target.
 * @param card - the adaptive card raw JSON.
 * @returns A `Promise` representing the asynchronous operation.
 *
 * @beta
 */
export function sendAdaptiveCard(target: NotificationTarget, card: unknown): Promise<void> {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "sendAdaptiveCard"),
    ErrorCode.RuntimeNotSupported
  );
}

/**
 * A {@link NotificationTarget} that represents a team channel.
 *
 * @remarks
 * Only work on server side.
 *
 * It's recommended to get channels from {@link TeamsBotInstallation.channels()}.
 *
 * @beta
 */
export class Channel implements NotificationTarget {
  /**
   * The parent {@link TeamsBotInstallation} where this channel is created from.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly parent: TeamsBotInstallation;

  /**
   * Detailed channel information.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly info: ChannelInfo;

  /**
   * Notification target type. For channel it's always "Channel".
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly type: NotificationTargetType = "Channel";

  /**
   * Constuctor.
   *
   * @remarks
   * Only work on server side.
   *
   * It's recommended to get channels from {@link TeamsBotInstallation.channels()}, instead of using this constructor.
   *
   * @param parent - The parent {@link TeamsBotInstallation} where this channel is created from.
   * @param info - Detailed channel information.
   *
   * @beta
   */
  constructor(parent: TeamsBotInstallation, info: ChannelInfo) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "Channel"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Send a plain text message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "Channel"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Send an adaptive card message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public async sendAdaptiveCard(card: unknown): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "Channel"),
      ErrorCode.RuntimeNotSupported
    );
  }
}

/**
 * A {@link NotificationTarget} that represents a team member.
 *
 * @remarks
 * Only work on server side.
 *
 * It's recommended to get members from {@link TeamsBotInstallation.members()}.
 *
 * @beta
 */
export class Member implements NotificationTarget {
  /**
   * The parent {@link TeamsBotInstallation} where this member is created from.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly parent: TeamsBotInstallation;

  /**
   * Detailed member account information.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly account: TeamsChannelAccount;

  /**
   * Notification target type. For member it's always "Person".
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly type: NotificationTargetType = "Person";

  /**
   * Constuctor.
   *
   * @remarks
   * Only work on server side.
   *
   * It's recommended to get members from {@link TeamsBotInstallation.members()}, instead of using this constructor.
   *
   * @param parent - The parent {@link TeamsBotInstallation} where this member is created from.
   * @param account - Detailed member account information.
   *
   * @beta
   */
  constructor(parent: TeamsBotInstallation, account: TeamsChannelAccount) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "Member"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Send a plain text message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "Member"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Send an adaptive card message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public async sendAdaptiveCard(card: unknown): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "Member"),
      ErrorCode.RuntimeNotSupported
    );
  }
}

/**
 * A {@link NotificationTarget} that represents a bot installation. Teams Bot could be installed into
 * - Personal chat
 * - Group chat
 * - Team (by default the `General` channel)
 *
 * @remarks
 * Only work on server side.
 *
 * It's recommended to get bot installations from {@link ConversationBot.installations()}.
 *
 * @beta
 */
export class TeamsBotInstallation implements NotificationTarget {
  /**
   * The bound `BotFrameworkAdapter`.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly adapter: BotFrameworkAdapter;

  /**
   * The bound `ConversationReference`.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly conversationReference: Partial<ConversationReference>;

  /**
   * Notification target type.
   *
   * @remarks
   * Only work on server side.
   * - "Channel" means bot is installed into a team and notification will be sent to its "General" channel.
   * - "Group" means bot is installed into a group chat.
   * - "Person" means bot is installed into a personal scope and notification will be sent to personal chat.
   *
   * @beta
   */
  public readonly type?: NotificationTargetType;

  /**
   * Constructor
   *
   * @remarks
   * Only work on server side.
   *
   * It's recommended to get bot installations from {@link ConversationBot.installations()}, instead of using this constructor.
   *
   * @param adapter - the bound `BotFrameworkAdapter`.
   * @param conversationReference - the bound `ConversationReference`.
   *
   * @beta
   */
  constructor(adapter: BotFrameworkAdapter, conversationReference: Partial<ConversationReference>) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "TeamsBotInstallation"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Send a plain text message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "TeamsBotInstallation"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Send an adaptive card message.
   *
   * @remarks
   * Only work on server side.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendAdaptiveCard(card: unknown): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "TeamsBotInstallation"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get channels from this bot installation.
   *
   * @remarks
   * Only work on server side.
   *
   * @returns an array of channels if bot is installed into a team, otherwise returns an empty array.
   *
   * @beta
   */
  public async channels(): Promise<Channel[]> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "TeamsBotInstallation"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get members from this bot installation.
   *
   * @remarks
   * Only work on server side.
   *
   * @returns an array of members from where the bot is installed.
   *
   * @beta
   */
  public async members(): Promise<Member[]> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "TeamsBotInstallation"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
