import { BotFrameworkAdapter, Storage } from "botbuilder";
import { LocalFileStorage } from "./fileStorage";
import { CommandResponseMiddleware, NotificationMiddleware } from "./middleware";
import { ConversationReferenceStore } from "./store";
import { TeamsBotInstallation } from "./context";
import { TeamsFxBotCommandHandler } from "./interface";

export interface BotConversationOptions {
  /**
   * If `storage` is not provided, a default LocalFileStorage will be used.
   * You could also use the `BlobsStorage` provided by botbuilder-azure-blobs
   * or `CosmosDbPartitionedStorage` provided by botbuilder-azure
   * */
  storage?: Storage;

  /**
   * Flag to specify whether to include the notification feature.
   */
  enableNotification?: boolean;

  /**
   * The command handlers to register with the underlying conversation bot that
   * can process a command and return a response.
   *
   * If provided, the corresponding handler will be involked if the bot received a message
   * that matches the command pattern (`string` or `RegExp`) defined in the handler.
   */
  commandHandlers?: TeamsFxBotCommandHandler[];
}

export class BotConversation {
  private static readonly conversationReferenceStoreKey = "teamfx-notification-targets";
  private static conversationReferenceStore: ConversationReferenceStore;
  private static adapter: BotFrameworkAdapter;

  public static Init(connector: BotFrameworkAdapter, options?: BotConversationOptions) {
    const storage = options?.storage ?? new LocalFileStorage();

    if (options.enableNotification) {
      BotConversation.conversationReferenceStore = new ConversationReferenceStore(
        storage,
        BotConversation.conversationReferenceStoreKey
      );

      BotConversation.adapter = connector.use(
        new NotificationMiddleware({
          conversationReferenceStore: BotConversation.conversationReferenceStore,
        })
      );
    }

    if (options.commandHandlers) {
      BotConversation.adapter = connector.use(
        new CommandResponseMiddleware(options.commandHandlers)
      );
    }
  }

  public static InitNotification(connector: BotFrameworkAdapter, options?: BotConversationOptions) {
    const storage = options?.storage ?? new LocalFileStorage();
    BotConversation.conversationReferenceStore = new ConversationReferenceStore(
      storage,
      BotConversation.conversationReferenceStoreKey
    );
    BotConversation.adapter = connector.use(
      new NotificationMiddleware({
        conversationReferenceStore: BotConversation.conversationReferenceStore,
      })
    );
  }

  public static InitCommandResponse(
    connector: BotFrameworkAdapter,
    commandHandlers: TeamsFxBotCommandHandler[]
  ) {
    BotConversation.adapter = connector.use(new CommandResponseMiddleware(commandHandlers));
  }

  public static async installations(): Promise<TeamsBotInstallation[]> {
    if (
      BotConversation.conversationReferenceStore === undefined ||
      BotConversation.adapter === undefined
    ) {
      throw new Error("BotNotification has not been initialized.");
    }

    const references = await BotConversation.conversationReferenceStore.list();
    const targets: TeamsBotInstallation[] = [];
    for (const reference of references) {
      targets.push(new TeamsBotInstallation(BotConversation.adapter, reference));
    }

    return targets;
  }
}
