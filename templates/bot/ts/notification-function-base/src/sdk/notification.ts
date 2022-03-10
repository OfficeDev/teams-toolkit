import {
  BotFrameworkAdapter,
  ConversationReference,
  TurnContext,
  Storage,
  Activity,
} from "botbuilder";
import { ConnectorClient } from "botframework-connector";
import { Channel, Member, NotificationTarget, TargetType } from "./context";
import { LocalFileStorage } from "./fileStorage";
import { NotificationMiddleware } from "./middleware";
import { ConversationReferenceStore } from "./store";

export interface AppNotificationOptions {
  /**
   * If `storage` is not provided, a default LocalFileStorage will be used.
   * You could also use the `BlobsStorage` provided by botbuilder-azure-blobs
   * or `CosmosDbPartitionedStorage` provided by botbuilder-azure
   * */
  storage?: Storage;
}

export class AppNotification {
  private readonly conversationReferenceStore: ConversationReferenceStore;
  private readonly adapter: BotFrameworkAdapter;
  private readonly conversationReferenceStoreKey = "teamfx-notification-targets";

  constructor(connector: BotFrameworkAdapter, options?: AppNotificationOptions) {
    const storage = options?.storage ?? new LocalFileStorage();
    this.conversationReferenceStore = new ConversationReferenceStore(
      storage,
      this.conversationReferenceStoreKey
    );
    this.adapter = connector.use(
      new NotificationMiddleware({
        conversationReferenceStore: this.conversationReferenceStore,
      })
    );
  }

  public async forEachNotificationTarget(
    action: (target: NotificationTarget) => Promise<void>
  ): Promise<void> {
    const references = await this.conversationReferenceStore.list();
    for (const reference of references) {
      const targetType = this.getTargetType(reference);
      await this.adapter.continueConversation(reference, async (context: TurnContext) => {
        await action(new NotificationTarget(context, targetType));
      });
    }
  }

  public async notify(
    activityOrText: string | Partial<Activity>,
    target: NotificationTarget | Member | Channel
  ): Promise<void> {
    if (target instanceof NotificationTarget) {
      await target.turnContext.sendActivity(activityOrText);
    } else if (target instanceof Member) {
      await this.notifyMember(activityOrText, target);
    } else if (target instanceof Channel) {
      await this.notifyChannel(activityOrText, target);
    } else {
      throw new Error("target is none of NotificationTarget|Member|Channel");
    }
  }

  public async notifyAll(
    activityOrText: string | Partial<Activity>,
    options?: { scope: "Default" | "Member" | "Channel" }
  ): Promise<void> {
    if (options === undefined || options.scope === "Default") {
      await this.forEachNotificationTarget(
        async (target) => await this.notify(activityOrText, target)
      );
    } else if (options.scope === "Member") {
      await this.forEachNotificationTarget(async (target) => {
        const members = await target.members();
        for (const member of members) {
          await this.notifyMember(activityOrText, member);
        }
      });
    } else if (options.scope === "Channel") {
      await this.forEachNotificationTarget(async (target) => {
        const channels = await target.channels();
        for (const channel of channels) {
          await this.notifyChannel(activityOrText, channel);
        }
      });
    }
  }

  private async notifyMember(
    activityOrText: string | Partial<Activity>,
    member: Member
  ): Promise<void> {
    const reference = TurnContext.getConversationReference(
      member.notificationTarget.turnContext.activity
    );
    const personalConversation = this.cloneConversation(reference);

    const connectorClient: ConnectorClient = member.notificationTarget.turnContext.turnState.get(
      this.adapter.ConnectorClientKey
    );
    const conversation = await connectorClient.conversations.createConversation({
      isGroup: false,
      tenantId: member.notificationTarget.turnContext.activity.conversation.tenantId,
      bot: member.notificationTarget.turnContext.activity.recipient,
      members: [member.account],
      activity: undefined,
      channelData: {},
    });
    personalConversation.conversation.id = conversation.id;

    await this.adapter.continueConversation(personalConversation, async (context: TurnContext) => {
      await context.sendActivity(activityOrText);
    });
  }

  private async notifyChannel(
    activityOrText: string | Partial<Activity>,
    channel: Channel
  ): Promise<void> {
    const reference = TurnContext.getConversationReference(
      channel.notificationTarget.turnContext.activity
    );
    const channelConversation = this.cloneConversation(reference);
    channelConversation.conversation.id = channel.info.id;

    await this.adapter.continueConversation(channelConversation, async (context: TurnContext) => {
      const response = await context.sendActivity(activityOrText);
    });
  }

  private cloneConversation(conversation: Partial<ConversationReference>): ConversationReference {
    return Object.assign(<ConversationReference>{}, conversation);
  }

  private getTargetType(
    conversationReference: Partial<ConversationReference>
  ): TargetType | undefined {
    const conversationType = conversationReference.conversation?.conversationType;
    if (conversationType === "personal") {
      return "Person";
    } else if (conversationType === "groupChat") {
      return "Group";
    } else if (conversationType === "channel") {
      return "Channel";
    } else {
      return undefined;
    }
  }
}
