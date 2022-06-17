// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, ActivityTypes, Middleware, TurnContext } from "botbuilder";
import { CommandMessage, TeamsFxBotCommandHandler, TriggerPatterns } from "./interface";
import { ConversationReferenceStore } from "./storage";
import { cloneConversation } from "./utils";

/**
 * @internal
 */
enum ActivityType {
  CurrentBotInstalled,
  CurrentBotMessaged,
  CurrentBotUninstalled,
  TeamDeleted,
  TeamRestored,
  Unknown,
}

/**
 * @internal
 */
export interface NotificationMiddlewareOptions {
  conversationReferenceStore: ConversationReferenceStore;
}

/**
 * @internal
 */
export class NotificationMiddleware implements Middleware {
  private readonly conversationReferenceStore: ConversationReferenceStore;

  constructor(options: NotificationMiddlewareOptions) {
    this.conversationReferenceStore = options.conversationReferenceStore;
  }

  public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    const type = this.classifyActivity(context.activity);
    switch (type) {
      case ActivityType.CurrentBotInstalled:
      case ActivityType.TeamRestored: {
        const reference = TurnContext.getConversationReference(context.activity);
        await this.conversationReferenceStore.set(reference);
        break;
      }
      case ActivityType.CurrentBotMessaged: {
        await this.tryAddMessagedReference(context);
        break;
      }
      case ActivityType.CurrentBotUninstalled:
      case ActivityType.TeamDeleted: {
        const reference = TurnContext.getConversationReference(context.activity);
        await this.conversationReferenceStore.delete(reference);
        break;
      }
      default:
        break;
    }

    await next();
  }

  private classifyActivity(activity: Activity): ActivityType {
    const activityType = activity.type;
    if (activityType === "installationUpdate") {
      const action = activity.action?.toLowerCase();
      if (action === "add") {
        return ActivityType.CurrentBotInstalled;
      } else {
        return ActivityType.CurrentBotUninstalled;
      }
    } else if (activityType === "conversationUpdate") {
      const eventType = activity.channelData?.eventType as string;
      if (eventType === "teamDeleted") {
        return ActivityType.TeamDeleted;
      } else if (eventType === "teamRestored") {
        return ActivityType.TeamRestored;
      }
    } else if (activityType === "message") {
      return ActivityType.CurrentBotMessaged;
    }

    return ActivityType.Unknown;
  }

  private async tryAddMessagedReference(context: TurnContext): Promise<void> {
    const reference = TurnContext.getConversationReference(context.activity);
    const conversationType = reference?.conversation?.conversationType;
    if (conversationType === "personal" || conversationType === "groupChat") {
      if (!(await this.conversationReferenceStore.check(reference))) {
        await this.conversationReferenceStore.set(reference);
      }
    } else if (conversationType === "channel") {
      const teamId = context.activity?.channelData?.team?.id;
      if (teamId !== undefined) {
        const teamReference = cloneConversation(reference);
        teamReference.conversation.id = teamId;
        if (!(await this.conversationReferenceStore.check(teamReference))) {
          await this.conversationReferenceStore.set(teamReference);
        }
      }
    }
  }
}

export class CommandResponseMiddleware implements Middleware {
  public readonly commandHandlers: TeamsFxBotCommandHandler[] = [];

  constructor(handlers?: TeamsFxBotCommandHandler[]) {
    if (handlers && handlers.length > 0) {
      this.commandHandlers.push(...handlers);
    }
  }

  public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    if (context.activity.type === ActivityTypes.Message) {
      // Invoke corresponding command handler for the command response
      const commandText = this.getActivityText(context.activity);

      const message: CommandMessage = {
        text: commandText,
      };

      for (const handler of this.commandHandlers) {
        const matchResult = this.shouldTrigger(handler.triggerPatterns, commandText);

        // It is important to note that the command bot will stop processing handlers
        // when the first command handler is matched.
        if (!!matchResult) {
          message.matches = Array.isArray(matchResult) ? matchResult : void 0;
          const response = await handler.handleCommandReceived(context, message);

          if (typeof response === "string") {
            await context.sendActivity(response);
          } else {
            const replyActivity = response as Partial<Activity>;
            if (replyActivity) {
              await context.sendActivity(replyActivity);
            }
          }
        }
      }
    }

    await next();
  }

  private matchPattern(pattern: string | RegExp, text: string): boolean | RegExpMatchArray {
    if (text) {
      if (typeof pattern === "string") {
        const regExp = new RegExp(pattern as string, "i");
        return regExp.test(text);
      }

      if (pattern instanceof RegExp) {
        const matches = text.match(pattern as RegExp);
        return matches ?? false;
      }
    }

    return false;
  }

  private shouldTrigger(patterns: TriggerPatterns, text: string): RegExpMatchArray | boolean {
    const expressions = Array.isArray(patterns) ? patterns : [patterns];

    for (const ex of expressions) {
      const arg = this.matchPattern(ex, text);
      if (arg) return arg;
    }

    return false;
  }

  private getActivityText(activity: Activity): string {
    let text = activity.text;
    const removedMentionText = TurnContext.removeRecipientMention(activity);
    if (removedMentionText) {
      text = removedMentionText
        .toLowerCase()
        .replace(/\n|\r\n/g, "")
        .trim();
    }

    return text;
  }
}
