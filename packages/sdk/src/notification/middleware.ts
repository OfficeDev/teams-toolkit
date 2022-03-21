// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, Middleware, TurnContext } from "botbuilder";
import { ConversationReferenceStore } from "./storage";

/**
 * @internal
 */
enum ActivityType {
  CurrentBotAdded,
  CurrentBotMessaged,
  CurrentBotRemoved,
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
      case ActivityType.CurrentBotAdded: {
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
      case ActivityType.CurrentBotRemoved: {
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
        return ActivityType.CurrentBotAdded;
      } else {
        return ActivityType.CurrentBotRemoved;
      }
    } else if (activityType === "message") {
      return ActivityType.CurrentBotMessaged;
    }

    return ActivityType.Unknown;
  }
}
