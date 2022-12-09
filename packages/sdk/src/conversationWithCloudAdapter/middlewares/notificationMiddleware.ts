// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, Middleware, TurnContext } from "botbuilder";
import { ConversationReferenceStore } from "../storage";
import { cloneConversation } from "../utils";

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
