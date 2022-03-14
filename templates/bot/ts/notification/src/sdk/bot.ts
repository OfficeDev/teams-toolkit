import { BotFrameworkAdapter, ConversationReference, TurnContext, Storage, Activity } from "botbuilder";
import { ConnectorClient } from "botframework-connector";
import { TeamsFxBotContext } from "./context";
import { FileStorage } from "./fileStorage";
import { TeamsFxMember, TeamsFxChannel, WelcomeMessage, TeamsFxBotSettingsProvider } from "./interfaces";
import { TeamsFxMiddleware } from "./middleware";
import { BotSettingsStore, ConversationReferenceStore } from "./store";

export interface TeamsFxBotOptions {
    /**
     * If `storage` is not provided, FileStorage will be used by default.
     * You could also use the `BlobsStorage` provided by botbuilder-azure-blobs
     * or `CosmosDbPartitionedStorage` provided by botbuilder-azure
     * */
    storage?: Storage,
    welcomeMessage?: WelcomeMessage,
    settingsProvider?: TeamsFxBotSettingsProvider
}

export class TeamsFxBot {
    private readonly conversationReferenceStore: ConversationReferenceStore;
    private readonly settingsStore: BotSettingsStore;
    private readonly adapter: BotFrameworkAdapter;
    private readonly conversationReferenceStoreKey = "teamfx-subscribers";
    private readonly settingsStoreKey = "teamsfx-settings";
    private readonly fileName = ".teamsfx.bot.json";

    constructor(adapter: BotFrameworkAdapter, options?: TeamsFxBotOptions) {
        const storage = options?.storage ?? new FileStorage(this.fileName);
        this.conversationReferenceStore = new ConversationReferenceStore(storage, this.conversationReferenceStoreKey);
        this.settingsStore = new BotSettingsStore(storage, this.settingsStoreKey);
        this.adapter = adapter.use(new TeamsFxMiddleware({
            conversationReferenceStore: this.conversationReferenceStore,
            settingsStore: this.settingsStore,
            welcomeMessage: options?.welcomeMessage,
            settingsProvider: options?.settingsProvider
        }));
    }

    public async forEachSubscribers(action: (subscriber: TeamsFxBotContext) => Promise<void>): Promise<void> {
        const references = await this.conversationReferenceStore.list();
        for (const reference of references)
            await this.adapter.continueConversation(reference, async (context: TurnContext) => {
                await action(new TeamsFxBotContext(context, this.settingsStore));
            });
    }

    public async notifySubscriber(subscriber: TeamsFxBotContext, activity: Partial<Activity>): Promise<void> {
        await subscriber.turnContext.sendActivity(activity);
    }

    public async notifyMember(member: TeamsFxMember, activity: Partial<Activity>): Promise<void> {
        const reference = TurnContext.getConversationReference(member.subscriber.turnContext.activity);
        const personalConversation = this.cloneConversation(reference);

        const connectorClient: ConnectorClient = member.subscriber.turnContext.turnState.get(this.adapter.ConnectorClientKey);
        const conversation = await connectorClient.conversations.createConversation({
            isGroup: false,
            tenantId: member.subscriber.turnContext.activity.conversation.tenantId,
            bot: member.subscriber.turnContext.activity.recipient,
            members: [member.account],
            activity: undefined,
            channelData: {},
        });
        personalConversation.conversation.id = conversation.id;

        await this.adapter.continueConversation(personalConversation, async (context: TurnContext) => {
            await context.sendActivity(activity);
        });
    }

    public async notifyChannel(channel: TeamsFxChannel, activity: Partial<Activity>): Promise<string> {
        const reference = TurnContext.getConversationReference(channel.subscriber.turnContext.activity);
        const channelConversation = this.cloneConversation(reference);
        channelConversation.conversation.id = channel.info.id;

        let messageId = "";
        await this.adapter.continueConversation(channelConversation, async (context: TurnContext) => {
            const response = await context.sendActivity(activity);
            messageId = response.id;
        });

        return messageId;
    }

    public async replyConversation(channel: TeamsFxChannel, messageId: string, activity: Partial<Activity>): Promise<void> {
        const reference = TurnContext.getConversationReference(channel.subscriber.turnContext.activity);
        const replayConversation = this.cloneConversation(reference);
        replayConversation.conversation.id = channel.info.id + `;messageid=${messageId}`;

        await this.adapter.continueConversation(replayConversation, async (context: TurnContext) => {
            try {
                await context.sendActivity(activity);
            } catch (err) {
                console.log(err);
            }
        });
    }

    private cloneConversation(conversation: Partial<ConversationReference>): ConversationReference {
        return Object.assign(<ConversationReference>{}, conversation);
    }
}
