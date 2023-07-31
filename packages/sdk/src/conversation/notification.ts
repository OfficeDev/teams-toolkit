// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  BotFrameworkAdapter,
  CardFactory,
  ChannelInfo,
  ConversationParameters,
  ConversationReference,
  TeamDetails,
  TeamsChannelAccount,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import { ConnectorClient } from "botframework-connector";
import * as path from "path";
import {
  NotificationTarget,
  NotificationTargetType,
  NotificationOptions,
  MessageResponse,
} from "./interface";
import { NotificationMiddleware } from "./middlewares/notificationMiddleware";
import { DefaultConversationReferenceStore, LocalFileStorage } from "./storage";
import * as utils from "./utils";

/**
 * Send a plain text message to a notification target.
 *
 * @param target - the notification target.
 * @param text - the plain text message.
 * @param onError - an optional error handler that can catch exceptions during message sending.
 * If not defined, error will be handled by `BotAdapter.onTurnError`.
 * @returns the response of sending message.
 */
export function sendMessage(
  target: NotificationTarget,
  text: string,
  onError?: (context: TurnContext, error: Error) => Promise<void>
): Promise<MessageResponse> {
  return target.sendMessage(text, onError);
}

/**
 * Send an adaptive card message to a notification target.
 *
 * @param target - the notification target.
 * @param card - the adaptive card raw JSON.
 * @param onError - an optional error handler that can catch exceptions during adaptive card sending.
 * If not defined, error will be handled by `BotAdapter.onTurnError`.
 * @returns the response of sending adaptive card message.
 */
export function sendAdaptiveCard(
  target: NotificationTarget,
  card: unknown,
  onError?: (context: TurnContext, error: Error) => Promise<void>
): Promise<MessageResponse> {
  return target.sendAdaptiveCard(card, onError);
}

/**
 * A {@link NotificationTarget} that represents a team channel.
 *
 * @remarks
 * It's recommended to get channels from {@link TeamsBotInstallation.channels()}.
 */
export class Channel implements NotificationTarget {
  /**
   * The parent {@link TeamsBotInstallation} where this channel is created from.
   */
  public readonly parent: TeamsBotInstallation;

  /**
   * Detailed channel information.
   */
  public readonly info: ChannelInfo;

  /**
   * Notification target type. For channel it's always "Channel".
   */
  public readonly type: NotificationTargetType = NotificationTargetType.Channel;

  /**
   * Constructor.
   *
   * @remarks
   * It's recommended to get channels from {@link TeamsBotInstallation.channels()}, instead of using this constructor.
   *
   * @param parent - The parent {@link TeamsBotInstallation} where this channel is created from.
   * @param info - Detailed channel information.
   */
  constructor(parent: TeamsBotInstallation, info: ChannelInfo) {
    this.parent = parent;
    this.info = info;
  }

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   * @param onError - an optional error handler that can catch exceptions during message sending.
   * If not defined, error will be handled by `BotAdapter.onTurnError`.
   * @returns the response of sending message.
   */
  public async sendMessage(
    text: string,
    onError?: (context: TurnContext, error: Error) => Promise<void>
  ): Promise<MessageResponse> {
    const response: MessageResponse = {};
    await this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          try {
            const res = await ctx.sendActivity(text);
            response.id = res?.id;
          } catch (error) {
            if (onError) {
              await onError(ctx, error as Error);
            } else {
              throw error;
            }
          }
        });
      }
    );
    return response;
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @param onError - an optional error handler that can catch exceptions during adaptive card sending.
   * If not defined, error will be handled by `BotAdapter.onTurnError`.
   * @returns the response of sending adaptive card message.
   */
  public async sendAdaptiveCard(
    card: unknown,
    onError?: (context: TurnContext, error: Error) => Promise<void>
  ): Promise<MessageResponse> {
    const response: MessageResponse = {};
    await this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          try {
            const res = await ctx.sendActivity({
              attachments: [CardFactory.adaptiveCard(card)],
            });
            response.id = res?.id;
          } catch (error) {
            if (onError) {
              await onError(ctx, error as Error);
            } else {
              throw error;
            }
          }
        });
      }
    );
    return response;
  }

  /**
   * @internal
   */
  private newConversation(context: TurnContext): ConversationReference {
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
 */
export class Member implements NotificationTarget {
  /**
   * The parent {@link TeamsBotInstallation} where this member is created from.
   */
  public readonly parent: TeamsBotInstallation;

  /**
   * Detailed member account information.
   */
  public readonly account: TeamsChannelAccount;

  /**
   * Notification target type. For member it's always "Person".
   */
  public readonly type: NotificationTargetType = NotificationTargetType.Person;

  /**
   * Constructor.
   *
   * @remarks
   * It's recommended to get members from {@link TeamsBotInstallation.members()}, instead of using this constructor.
   *
   * @param parent - The parent {@link TeamsBotInstallation} where this member is created from.
   * @param account - Detailed member account information.
   */
  constructor(parent: TeamsBotInstallation, account: TeamsChannelAccount) {
    this.parent = parent;
    this.account = account;
  }

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   * @param onError - an optional error handler that can catch exceptions during message sending.
   * If not defined, error will be handled by `BotAdapter.onTurnError`.
   * @returns the response of sending message.
   */
  public async sendMessage(
    text: string,
    onError?: (context: TurnContext, error: Error) => Promise<void>
  ): Promise<MessageResponse> {
    const response: MessageResponse = {};
    await this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = await this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          try {
            const res = await ctx.sendActivity(text);
            response.id = res?.id;
          } catch (error) {
            if (onError) {
              await onError(ctx, error as Error);
            } else {
              throw error;
            }
          }
        });
      }
    );
    return response;
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @param onError - an optional error handler that can catch exceptions during adaptive card sending.
   * If not defined, error will be handled by `BotAdapter.onTurnError`.
   * @returns the response of sending adaptive card message.
   */
  public async sendAdaptiveCard(
    card: unknown,
    onError?: (context: TurnContext, error: Error) => Promise<void>
  ): Promise<MessageResponse> {
    const response: MessageResponse = {};
    await this.parent.adapter.continueConversation(
      this.parent.conversationReference,
      async (context) => {
        const conversation = await this.newConversation(context);
        await this.parent.adapter.continueConversation(conversation, async (ctx: TurnContext) => {
          try {
            const res = await ctx.sendActivity({
              attachments: [CardFactory.adaptiveCard(card)],
            });
            response.id = res?.id;
          } catch (error) {
            if (onError) {
              await onError(ctx, error as Error);
            } else {
              throw error;
            }
          }
        });
      }
    );
    return response;
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
 */

/**
 * @deprecated Use `BotBuilderCloudAdapter.TeamsBotInstallation` instead.
 */
export class TeamsBotInstallation implements NotificationTarget {
  /**
   * The bound `BotFrameworkAdapter`.
   */
  public readonly adapter: BotFrameworkAdapter;

  /**
   * The bound `ConversationReference`.
   */
  public readonly conversationReference: Partial<ConversationReference>;

  /**
   * Notification target type.
   *
   * @remarks
   * - "Channel" means bot is installed into a team and notification will be sent to its "General" channel.
   * - "Group" means bot is installed into a group chat.
   * - "Person" means bot is installed into a personal scope and notification will be sent to personal chat.
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
   * @param onError - an optional error handler that can catch exceptions during message sending.
   * If not defined, error will be handled by `BotAdapter.onTurnError`.
   * @returns the response of sending message.
   */
  public async sendMessage(
    text: string,
    onError?: (context: TurnContext, error: Error) => Promise<void>
  ): Promise<MessageResponse> {
    const response: MessageResponse = {};
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      try {
        const res = await context.sendActivity(text);
        response.id = res?.id;
      } catch (error) {
        if (onError) {
          await onError(context, error as Error);
        } else {
          throw error;
        }
      }
    });
    return response;
  }

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   * @param onError - an optional error handler that can catch exceptions during adaptive card sending.
   * If not defined, error will be handled by `BotAdapter.onTurnError`.
   * @returns the response of sending adaptive card message.
   */
  public async sendAdaptiveCard(
    card: unknown,
    onError?: (context: TurnContext, error: Error) => Promise<void>
  ): Promise<MessageResponse> {
    const response: MessageResponse = {};
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      try {
        const res = await context.sendActivity({
          attachments: [CardFactory.adaptiveCard(card)],
        });
        response.id = res?.id;
      } catch (error) {
        if (onError) {
          await onError(context, error as Error);
        } else {
          throw error;
        }
      }
    });
    return response;
  }

  /**
   * Get channels from this bot installation.
   *
   * @returns an array of channels if bot is installed into a team, otherwise returns an empty array.
   */
  public async channels(): Promise<Channel[]> {
    const channels: Channel[] = [];
    if (this.type !== NotificationTargetType.Channel) {
      return channels;
    }

    let teamsChannels: ChannelInfo[] = [];
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      const teamId = utils.getTeamsBotInstallationId(context);
      if (teamId !== undefined) {
        teamsChannels = await TeamsInfo.getTeamChannels(context, teamId);
      }
    });

    for (const channel of teamsChannels) {
      channels.push(new Channel(this, channel));
    }

    return channels;
  }

  /**
   * Get members from this bot installation.
   *
   * @returns an array of members from where the bot is installed.
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

  /**
   * Get team details from this bot installation
   *
   * @returns the team details if bot is installed into a team, otherwise returns undefined.
   */
  public async getTeamDetails(): Promise<TeamDetails | undefined> {
    if (this.type !== NotificationTargetType.Channel) {
      return undefined;
    }

    let teamDetails: TeamDetails | undefined;
    await this.adapter.continueConversation(this.conversationReference, async (context) => {
      const teamId = utils.getTeamsBotInstallationId(context);
      if (teamId !== undefined) {
        teamDetails = await TeamsInfo.getTeamDetails(context, teamId);
      }
    });

    return teamDetails;
  }
}

/**
 * Provide utilities to send notification to varies targets (e.g., member, group, channel).
 */

/**
 * @deprecated Use `BotBuilderCloudAdapter.NotificationBot` instead.
 */
export class NotificationBot {
  private readonly conversationReferenceStore: DefaultConversationReferenceStore;
  private readonly adapter: BotFrameworkAdapter;

  /**
   * constructor of the notification bot.
   *
   * @remarks
   * To ensure accuracy, it's recommended to initialize before handling any message.
   *
   * @param adapter - the bound `BotFrameworkAdapter`
   * @param options - initialize options
   */
  public constructor(adapter: BotFrameworkAdapter, options?: NotificationOptions) {
    const storage =
      options?.storage ??
      new LocalFileStorage(
        path.resolve(process.env.RUNNING_ON_AZURE === "1" ? process.env.TEMP ?? "./" : "./")
      );

    this.conversationReferenceStore = new DefaultConversationReferenceStore(storage);
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
   */
  public async installations(): Promise<TeamsBotInstallation[]> {
    if (this.conversationReferenceStore === undefined || this.adapter === undefined) {
      throw new Error("NotificationBot has not been initialized.");
    }

    const { data: references } = await this.conversationReferenceStore.list();
    const targets: TeamsBotInstallation[] = [];
    for (const reference of references) {
      // validate connection
      let valid = true;
      await this.adapter.continueConversation(reference, async (context) => {
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
        await this.conversationReferenceStore.remove(utils.getKey(reference), reference);
      }
    }

    return targets;
  }

  /**
   * Returns the first {@link Member} where predicate is true, and undefined otherwise.
   *
   * @param predicate find calls predicate once for each member of the installation,
   * until it finds one where predicate returns true. If such a member is found, find
   * immediately returns that member. Otherwise, find returns undefined.
   * @param scope the scope to find members from the installations
   * (personal chat, group chat, Teams channel).
   * @returns the first {@link Member} where predicate is true, and undefined otherwise.
   */
  public async findMember(
    predicate: (member: Member) => Promise<boolean>,
    scope?: SearchScope
  ): Promise<Member | undefined> {
    for (const target of await this.installations()) {
      if (this.matchSearchScope(target, scope)) {
        for (const member of await target.members()) {
          if (await predicate(member)) {
            return member;
          }
        }
      }
    }

    return;
  }

  /**
   * Returns the first {@link Channel} where predicate is true, and undefined otherwise.
   * (Ensure the bot app is installed into the `General` channel, otherwise undefined will be returned.)
   *
   * @param predicate find calls predicate once for each channel of the installation,
   * until it finds one where predicate returns true. If such a channel is found, find
   * immediately returns that channel. Otherwise, find returns undefined.
   * @returns the first {@link Channel} where predicate is true, and undefined otherwise.
   */
  public async findChannel(
    predicate: (channel: Channel, teamDetails: TeamDetails | undefined) => Promise<boolean>
  ): Promise<Channel | undefined> {
    for (const target of await this.installations()) {
      if (target.type === NotificationTargetType.Channel) {
        const teamDetails = await target.getTeamDetails();
        for (const channel of await target.channels()) {
          if (await predicate(channel, teamDetails)) {
            return channel;
          }
        }
      }
    }

    return;
  }

  /**
   * Returns all {@link Member} where predicate is true, and empty array otherwise.
   *
   * @param predicate find calls predicate for each member of the installation.
   * @param scope the scope to find members from the installations
   * (personal chat, group chat, Teams channel).
   * @returns an array of {@link Member} where predicate is true, and empty array otherwise.
   */
  public async findAllMembers(
    predicate: (member: Member) => Promise<boolean>,
    scope?: SearchScope
  ): Promise<Member[]> {
    const members: Member[] = [];
    for (const target of await this.installations()) {
      if (this.matchSearchScope(target, scope)) {
        for (const member of await target.members()) {
          if (await predicate(member)) {
            members.push(member);
          }
        }
      }
    }

    return members;
  }

  /**
   * Returns all {@link Channel} where predicate is true, and empty array otherwise.
   * (Ensure the bot app is installed into the `General` channel, otherwise empty array will be returned.)
   *
   * @param predicate find calls predicate for each channel of the installation.
   * @returns an array of {@link Channel} where predicate is true, and empty array otherwise.
   */
  public async findAllChannels(
    predicate: (channel: Channel, teamDetails: TeamDetails | undefined) => Promise<boolean>
  ): Promise<Channel[]> {
    const channels: Channel[] = [];
    for (const target of await this.installations()) {
      if (target.type === NotificationTargetType.Channel) {
        const teamDetails = await target.getTeamDetails();
        for (const channel of await target.channels()) {
          if (await predicate(channel, teamDetails)) {
            channels.push(channel);
          }
        }
      }
    }

    return channels;
  }

  private matchSearchScope(target: NotificationTarget, scope?: SearchScope): boolean {
    scope = scope ?? SearchScope.All;

    return (
      (target.type === NotificationTargetType.Channel && (scope & SearchScope.Channel) !== 0) ||
      (target.type === NotificationTargetType.Group && (scope & SearchScope.Group) !== 0) ||
      (target.type === NotificationTargetType.Person && (scope & SearchScope.Person) !== 0)
    );
  }
}

/**
 * The search scope when calling {@link NotificationBot.findMember} and {@link NotificationBot.findAllMembers}.
 * The search scope is a flagged enum and it can be combined with `|`.
 * For example, to search from personal chat and group chat, use `SearchScope.Person | SearchScope.Group`.
 */
export enum SearchScope {
  /**
   * Search members from the installations in personal chat only.
   */
  Person = 1,

  /**
   * Search members from the installations in group chat only.
   */
  Group = 2,

  /**
   * Search members from the installations in Teams channel only.
   */
  Channel = 4,

  /**
   * Search members from all installations including personal chat, group chat and Teams channel.
   */
  All = Person | Group | Channel,
}
