import { Activity, Middleware, TurnContext } from "botbuilder";
import { ConversationReferenceStore } from "./store";

export interface NotificationMiddlewareOptions {
  conversationReferenceStore: ConversationReferenceStore;
}

enum ActivityType {
  CurrentBotAdded,
  Unknown,
}

export class NotificationMiddleware implements Middleware {
  private readonly conversationReferenceStore: ConversationReferenceStore;

  constructor(options: NotificationMiddlewareOptions) {
    this.conversationReferenceStore = options.conversationReferenceStore;
  }

  public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    const type = this.classifyActivity(context.activity);
    switch (type) {
      case ActivityType.CurrentBotAdded:
        const reference = TurnContext.getConversationReference(context.activity);
        await this.conversationReferenceStore.add(reference);
        break;
      default:
        break;
    }

    await next();
  }

  private classifyActivity(activity: Activity): ActivityType {
    if (this.isBotAdded(activity)) {
      return ActivityType.CurrentBotAdded;
    }

    return ActivityType.Unknown;
  }

  private isBotAdded(activity: Partial<Activity>): boolean {
    if (activity.membersAdded?.length > 0) {
      for (const member of activity.membersAdded) {
        if (member.id === activity.recipient.id) {
          return true;
        }
      }
    }

    return false;
  }
}
