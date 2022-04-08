// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
import { NotificationTarget, NotificationTargetType, NotificationOptions } from "./interface";
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
 * It's recommended to get bot installations from {@link ConversationBot.installations()}.
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
   * It's recommended to get bot installations from {@link ConversationBot.installations()}, instead of using this constructor.
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
    const members: Member[] = [];
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      let continuationToken: string | undefined;
      do {
        const pagedMembers = await TeamsInfo.getPagedMembers(context, undefined, continuationToken);
        continuationToken = pagedMembers.continuationToken;
        for (const member of pagedMembers.members) {
          members.push(new Member(this, member));
        }
      } while (continuationToken !== undefined);
    });

    return members;
  }
}

/**
 * Provide utilities to send notification to varies targets (e.g., member, group, channel).
 *
 * @beta
 */
export class NotificationBot {
  private readonly conversationReferenceStore: ConversationReferenceStore;
  private readonly adapter: BotFrameworkAdapter;

  /**
   * constructor of the notification bot.
   *
   * @remarks
   * To ensure accuracy, it's recommended to initialize before handling any message.
   *
   * @param adapter - the bound `BotFrameworkAdapter`
   * @param options - initialize options
   *
   * @beta
   */
  public constructor(adapter: BotFrameworkAdapter, options?: NotificationOptions) {
    const storage =
      options?.storage ??
      new LocalFileStorage(
        path.resolve(process.env.RUNNING_ON_AZURE === "1" ? process.env.TEMP ?? "./" : "./")
      );

    this.conversationReferenceStore = new ConversationReferenceStore(storage);
    this.adapter = adapter.use(
      new NotificationMiddleware({
        conversationReferenceStore: this.conversationReferenceStore,
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
  public async installations(): Promise<TeamsBotInstallation[]> {
    if (this.conversationReferenceStore === undefined || this.adapter === undefined) {
      throw new Error("NotificationBot has not been initialized.");
    }

    const references = (await this.conversationReferenceStore.getAll()).values();
    const targets: TeamsBotInstallation[] = [];
    for (const reference of references) {
      // validate connection
      let valid = true;
      this.adapter.continueConversation(reference, async (context) => {
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
        targets.push(new TeamsBotInstallation(this.adapter, reference));
      } else {
        this.conversationReferenceStore.delete(reference);
      }
    }

    return targets;
  }
}
