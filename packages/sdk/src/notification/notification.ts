// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import {
  BotFrameworkAdapter,
  CardFactory,
  ChannelInfo,
  ConversationParameters,
  ConversationReference,
  Storage,
  TeamsChannelAccount,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import { ConnectorClient } from "botframework-connector";
import { NotificationTarget, NotificationTargetType } from "./interface";
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

export class Channel implements NotificationTarget {
  public readonly parent: TeamsBotInstallation;
  public readonly info: ChannelInfo;
  public readonly type: NotificationTargetType = "Channel";

  constructor(parent: TeamsBotInstallation, info: ChannelInfo) {
    this.parent = parent;
    this.info = info;
  }

  public sendMessage(text: string): Promise<void> {
    return this.parent.continueConversation(async (context) => {
      const conversation = await this.newConversation(context);
      await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
        await ctx.sendActivity(text);
      });
    });
  }

  public async sendAdaptiveCard(card: unknown): Promise<void> {
    return this.parent.continueConversation(async (context) => {
      const conversation = await this.newConversation(context);
      await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
        await ctx.sendActivity({
          attachments: [CardFactory.adaptiveCard(card)],
        });
      });
    });
  }

  private async newConversation(context: TurnContext): Promise<ConversationReference> {
    const reference = TurnContext.getConversationReference(context.activity);
    const channelConversation = utils.cloneConversation(reference);
    channelConversation.conversation.id = this.info.id || "";

    return channelConversation;
  }
}

export class Member implements NotificationTarget {
  public readonly parent: TeamsBotInstallation;
  public readonly account: TeamsChannelAccount;
  public readonly type: NotificationTargetType = "Person";

  constructor(parent: TeamsBotInstallation, account: TeamsChannelAccount) {
    this.parent = parent;
    this.account = account;
  }

  public sendMessage(text: string): Promise<void> {
    return this.parent.continueConversation(async (context) => {
      const conversation = await this.newConversation(context);
      await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
        await ctx.sendActivity(text);
      });
    });
  }

  public async sendAdaptiveCard(card: unknown): Promise<void> {
    return this.parent.continueConversation(async (context) => {
      const conversation = await this.newConversation(context);
      await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
        await ctx.sendActivity({
          attachments: [CardFactory.adaptiveCard(card)],
        });
      });
    });
  }

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

export class TeamsBotInstallation implements NotificationTarget {
  public readonly adapter: BotFrameworkAdapter;
  public readonly conversationReference: Partial<ConversationReference>;
  public readonly type?: NotificationTargetType;

  constructor(adapter: BotFrameworkAdapter, conversationReference: Partial<ConversationReference>) {
    this.adapter = adapter;
    this.conversationReference = conversationReference;
    this.type = utils.getTargetType(conversationReference);
  }

  public sendMessage(text: string): Promise<void> {
    return this.continueConversation(async (context) => {
      await context.sendActivity(text);
    });
  }

  public sendAdaptiveCard(card: unknown): Promise<void> {
    return this.continueConversation(async (context) => {
      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)],
      });
    });
  }

  public async channels(): Promise<Channel[]> {
    let teamsChannels: ChannelInfo[] = [];
    await this.continueConversation(async (context) => {
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

  public async members(): Promise<Member[]> {
    let teamsMembers: TeamsChannelAccount[] = [];
    await this.continueConversation(async (context) => {
      teamsMembers = await TeamsInfo.getMembers(context);
    });
    const members: Member[] = [];
    for (const member of teamsMembers) {
      members.push(new Member(this, member));
    }

    return members;
  }

  public continueConversation(logic: (context: TurnContext) => Promise<void>): Promise<void> {
    return this.adapter.continueConversation(this.conversationReference, logic);
  }
}

export class IncomingWebhookTarget implements NotificationTarget {
  public readonly type: NotificationTargetType = "Channel";
  public readonly webhook: URL;

  constructor(webhook: URL) {
    this.webhook = webhook;
  }

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

export interface BotNotificationOptions {
  storage?: Storage;
}

export class BotNotification {
  private static readonly conversationReferenceStoreKey = "teamfx-notification-targets";
  private static conversationReferenceStore: ConversationReferenceStore;
  private static adapter: BotFrameworkAdapter;

  public static Initialize(connector: BotFrameworkAdapter, options?: BotNotificationOptions) {
    const storage = options?.storage ?? new LocalFileStorage();
    BotNotification.conversationReferenceStore = new ConversationReferenceStore(
      storage,
      BotNotification.conversationReferenceStoreKey
    );
    BotNotification.adapter = connector.use(
      new NotificationMiddleware({
        conversationReferenceStore: BotNotification.conversationReferenceStore,
      })
    );
  }

  public static async installations(): Promise<TeamsBotInstallation[]> {
    if (
      BotNotification.conversationReferenceStore === undefined ||
      BotNotification.adapter === undefined
    ) {
      throw new Error("BotNotification has not been initialized.");
    }

    const references = await BotNotification.conversationReferenceStore.list();
    const targets: TeamsBotInstallation[] = [];
    for (const reference of references) {
      targets.push(new TeamsBotInstallation(BotNotification.adapter, reference));
    }

    return targets;
  }
}
