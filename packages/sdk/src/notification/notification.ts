// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import {
  BotFrameworkAdapter,
  CardFactory,
  ChannelInfo,
  ConversationParameters,
  ConversationReference,
  TeamsChannelAccount,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import { ConnectorClient } from "botframework-connector";
import * as path from "path";
import { NotificationTarget, NotificationTargetStorage, NotificationTargetType } from "./interface";
import { NotificationMiddleware } from "./middleware";
import { ConversationReferenceStore, LocalFileStorage } from "./storage";
import * as utils from "./utils";

/**
 * Send a plain text message to a notification target.
 *
 * @param target - the notification target.
 * @param text - the plain text message.
 * @returns A `Promise` representing the asynchronous operation.
 *
 * @beta
 */
export function sendMessage(target: NotificationTarget, text: string): Promise<void> {
  return target.sendMessage(text);
}

/**
 * Send an adaptive card message to a notification target.
 *
 * @param target - the notification target.
 * @param card - the adaptive card raw JSON.
 * @returns A `Promise` representing the asynchronous operation.
 *
 * @beta
 */
export function sendAdaptiveCard(target: NotificationTarget, card: unknown): Promise<void> {
  return target.sendAdaptiveCard(card);
}

/**
 * A {@link NotificationTarget} that represents a team channel.
 *
 * @remarks
 * It's recommended to get channels from {@link TeamsBotInstallation.channels()}.
 *
 * @beta
 */
export class Channel implements NotificationTarget {
  /**
   * The parent {@link TeamsBotInstallation} where this channel is created from.
   *
   * @beta
   */
  public readonly parent: TeamsBotInstallation;

  /**
   * Detailed channel information.
   *
   * @beta
   */
  public readonly info: ChannelInfo;

  /**
   * Notification target type. For channel it's always "Channel".
   *
   * @beta
   */
  public readonly type: NotificationTargetType = "Channel";

  /**
   * Constuctor.
   *
   * @remarks
   * It's recommended to get channels from {@link TeamsBotInstallation.channels()}, instead of using this constructor.
   *
   * @param parent - The parent {@link TeamsBotInstallation} where this channel is created from.
   * @param info - Detailed channel information.
   *
   * @beta
   */
  constructor(parent: TeamsBotInstallation, info: ChannelInfo) {
    this.parent = parent;
    this.info = info;
  }

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    return this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = await this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          await ctx.sendActivity(text);
        });
      }
    );
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public async sendAdaptiveCard(card: unknown): Promise<void> {
    return this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = await this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          await ctx.sendActivity({
            attachments: [CardFactory.adaptiveCard(card)],
          });
        });
      }
    );
  }

  /**
   * @internal
   */
  private async newConversation(context: TurnContext): Promise<ConversationReference> {
    const reference = TurnContext.getConversationReference(context.activity);
    const channelConversation = utils.cloneConversation(reference);
    channelConversation.conversation.id = this.info.id || "";

    return channelConversation;
  }
}

/**
 * A {@link NotificationTarget} that represents a team member.
 *
 * @remarks
 * It's recommended to get members from {@link TeamsBotInstallation.members()}.
 *
 * @beta
 */
export class Member implements NotificationTarget {
  /**
   * The parent {@link TeamsBotInstallation} where this member is created from.
   *
   * @beta
   */
  public readonly parent: TeamsBotInstallation;

  /**
   * Detailed member account information.
   *
   * @beta
   */
  public readonly account: TeamsChannelAccount;

  /**
   * Notification target type. For member it's always "Person".
   *
   * @beta
   */
  public readonly type: NotificationTargetType = "Person";

  /**
   * Constuctor.
   *
   * @remarks
   * It's recommended to get members from {@link TeamsBotInstallation.members()}, instead of using this constructor.
   *
   * @param parent - The parent {@link TeamsBotInstallation} where this member is created from.
   * @param account - Detailed member account information.
   *
   * @beta
   */
  constructor(parent: TeamsBotInstallation, account: TeamsChannelAccount) {
    this.parent = parent;
    this.account = account;
  }

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    return this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = await this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          await ctx.sendActivity(text);
        });
      }
    );
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public async sendAdaptiveCard(card: unknown): Promise<void> {
    return this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = await this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          await ctx.sendActivity({
            attachments: [CardFactory.adaptiveCard(card)],
          });
        });
      }
    );
  }

  /**
   * @internal
   */
  private async newConversation(context: TurnContext): Promise<ConversationReference> {
    const reference = TurnContext.getConversationReference(context.activity);
    const personalConversation = utils.cloneConversation(reference);

    const connectorClient: ConnectorClient = context.turnState.get(
      this.parent.adapter.ConnectorClientKey
    );
    const conversation = await connectorClient.conversations.createConversation({
      isGroup: false,
      tenantId: context.activity.conversation.tenantId,
      bot: context.activity.recipient,
      members: [this.account],
      channelData: {},
    } as ConversationParameters);
    personalConversation.conversation.id = conversation.id;

    return personalConversation;
  }
}

/**
 * A {@link NotificationTarget} that represents a bot installation. Teams Bot could be installed into
 * - Personal chat
 * - Group chat
 * - Team (by default the `General` channel)
 *
 * @remarks
 * It's recommended to get bot installations from {@link BotNotification.installations()}.
 *
 * @beta
 */
export class TeamsBotInstallation implements NotificationTarget {
  /**
   * The bound `BotFrameworkAdapter`.
   *
   * @beta
   */
  public readonly adapter: BotFrameworkAdapter;

  /**
   * The bound `ConversationReference`.
   *
   * @beta
   */
  public readonly conversationReference: Partial<ConversationReference>;

  /**
   * Notification target type.
   *
   * @remarks
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
   * It's recommended to get bot installations from {@link BotNotification.installations()}, instead of using this constructor.
   *
   * @param adapter - the bound `BotFrameworkAdapter`.
   * @param conversationReference - the bound `ConversationReference`.
   *
   * @beta
   */
  constructor(adapter: BotFrameworkAdapter, conversationReference: Partial<ConversationReference>) {
    this.adapter = adapter;
    this.conversationReference = conversationReference;
    this.type = utils.getTargetType(conversationReference);
  }

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    return this.adapter.continueConversation(this.conversationReference, async (context) => {
      await context.sendActivity(text);
    });
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendAdaptiveCard(card: unknown): Promise<void> {
    return this.adapter.continueConversation(this.conversationReference, async (context) => {
      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)],
      });
    });
  }

  /**
   * Get channels from this bot installation.
   *
   * @returns an array of channels if bot is installed into a team, otherwise returns an empty array.
   *
   * @beta
   */
  public async channels(): Promise<Channel[]> {
    let teamsChannels: ChannelInfo[] = [];
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      const teamId = utils.getTeamsBotInstallationId(context);
      if (teamId !== undefined) {
        teamsChannels = await TeamsInfo.getTeamChannels(context, teamId);
      }
    });

    const channels: Channel[] = [];
    for (const channel of teamsChannels) {
      channels.push(new Channel(this, channel));
    }

    return channels;
  }

  /**
   * Get members from this bot installation.
   *
   * @returns an array of members from where the bot is installed.
   *
   * @beta
   */
  public async members(): Promise<Member[]> {
    let teamsMembers: TeamsChannelAccount[] = [];
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      teamsMembers = await TeamsInfo.getMembers(context);
    });
    const members: Member[] = [];
    for (const member of teamsMembers) {
      members.push(new Member(this, member));
    }

    return members;
  }
}

/**
 * A {@link NotificationTarget} that represents a team channel, creating from incoming webhook.
 *
 * @example
 * Here's an example on how to send notification via incoming webhook.
 * ```typescript
 * const target = new IncomingWebhookTarget(new URL("your-webhook-url"));
 * await target.sendMessage("Hello Notification");
 * ```
 *
 * @beta
 */
export class IncomingWebhookTarget implements NotificationTarget {
  /**
   * Notification target type. For incoming webhook it's always "Channel".
   *
   * @beta
   */
  public readonly type: NotificationTargetType = "Channel";

  /**
   * The bound incoming webhook URL.
   *
   * @beta
   */
  public readonly webhook: URL;

  /**
   * Constructor.
   *
   * @param webhook - the incoming webhook URL.
   *
   * @beta
   */
  constructor(webhook: URL) {
    this.webhook = webhook;
  }

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendMessage(text: string): Promise<void> {
    return axios.post(
      this.webhook.toString(),
      {
        text: text,
      },
      {
        headers: { "content-type": "application/json" },
      }
    );
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @returns A `Promise` representing the asynchronous operation.
   *
   * @beta
   */
  public sendAdaptiveCard(card: unknown): Promise<void> {
    return axios.post(
      this.webhook.toString(),
      {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: card,
          },
        ],
      },
      {
        headers: { "content-type": "application/json" },
      }
    );
  }
}

/**
 * Options to initialize {@link BotNotification}.
 *
 * @beta
 */
export interface BotNotificationOptions {
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
 * Provide static utilities for bot notification.
 *
 * @example
 * Here's an example on how to send notification via Teams Bot.
 * ```typescript
 * // initialize (it's recommended to be called before handling any bot message)
 * BotNotification.initialize(adapter);
 *
 * // get all bot installations and send message
 * for (const target of await BotNotification.installations()) {
 *   await target.sendMessage("Hello Notification");
 * }
 *
 * // alternative - send message to all members
 * for (const target of await BotNotification.installations()) {
 *   for (const member of await target.members()) {
 *     await member.sendMessage("Hello Notification");
 *   }
 * }
 * ```
 *
 * @beta
 */
export class BotNotification {
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
  public static initialize(adapter: BotFrameworkAdapter, options?: BotNotificationOptions) {
    const storage =
      options?.storage ??
      new LocalFileStorage(
        path.resolve(process.env.RUNNING_ON_AZURE === "1" ? process.env.TEMP ?? "./" : "./")
      );
    BotNotification.conversationReferenceStore = new ConversationReferenceStore(storage);
    BotNotification.adapter = adapter.use(
      new NotificationMiddleware({
        conversationReferenceStore: BotNotification.conversationReferenceStore,
      })
    );
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
      BotNotification.conversationReferenceStore === undefined ||
      BotNotification.adapter === undefined
    ) {
      throw new Error("BotNotification has not been initialized.");
    }

    const references = (await BotNotification.conversationReferenceStore.getAll()).values();
    const targets: TeamsBotInstallation[] = [];
    for (const reference of references) {
      targets.push(new TeamsBotInstallation(BotNotification.adapter, reference));
    }

    return targets;
  }
}
