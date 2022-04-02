// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, Middleware, TurnContext } from "botbuilder";
import { TeamsFxBotCommandHandler } from "./interface";
import { ConversationReferenceStore } from "./storage";

/**
 * @internal
 */
enum ActivityType {
  CurrentBotInstalled,
  CurrentBotMessaged,
  CurrentBotUninstalled,
  TeamDeleted,
  TeamRestored,
  CommandReceived,
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
        const reference = TurnContext.getConversationReference(context.activity);
        if (!(await this.conversationReferenceStore.check(reference))) {
          await this.conversationReferenceStore.set(reference);
        }
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
    } else if (activityType === "message") {
      return ActivityType.CurrentBotMessaged;
    } else if (activityType === "conversationUpdate") {
      const eventType = activity.channelData?.eventType as string;
      if (eventType === "teamDeleted") {
        return ActivityType.TeamDeleted;
      } else if (eventType === "teamRestored") {
        return ActivityType.TeamRestored;
      }
    }

    return ActivityType.Unknown;
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
    const type = this.classifyActivity(context.activity);
    let handlers: TeamsFxBotCommandHandler[] = [];

    switch (type) {
      case ActivityType.CommandReceived:
        // Invoke corresponding command handler for the command response
        const commandText = this.getActivityText(context.activity);
        handlers = this.filterCommandHandler(commandText, this.commandHandlers);

        if (handlers.length > 0) {
          const response = await handlers[0].handleCommandReceived(context, commandText);
          await context.sendActivity(response);
        }
        break;
      default:
        break;
    }

    await next();
  }

  private classifyActivity(activity: Activity): ActivityType {
    if (this.isCommandReceived(activity)) {
      return ActivityType.CommandReceived;
    }

    return ActivityType.Unknown;
  }

  private isCommandReceived(activity: Activity): boolean {
    if (this.commandHandlers) {
      const commandText = this.getActivityText(activity);
      const handlers = this.filterCommandHandler(commandText, this.commandHandlers);
      return handlers.length > 0;
    } else {
      return false;
    }
  }

  private filterCommandHandler(commandText: string, commandHandlers: TeamsFxBotCommandHandler[]) {
    const handlers = commandHandlers.filter((handler) => {
      if (typeof handler.commandNameOrPattern === "string") {
        return handler.commandNameOrPattern.toLocaleLowerCase() === commandText;
      } else {
        return handler.commandNameOrPattern?.test(commandText);
      }
    });

    return handlers;
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
