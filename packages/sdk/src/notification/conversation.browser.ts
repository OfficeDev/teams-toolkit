import { BotFrameworkAdapter } from "botbuilder";
import { NotificationTargetStorage, TeamsFxBotCommandHandler } from "./interface";
import { ConversationReferenceStore } from "./storage";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { TeamsBotInstallation } from "./notification";
import { formatString } from "../util/utils";

/**
 * Options to initialize {@link ConversationBot}.
 *
 * @remarks
 * Only work on server side.
 *
 * @beta
 */
export interface ConversationOptions {
  /**
   * A boolean, controlling whether to whether to include the notification feature.
   *
   * (default: `false`).
   */
  enableNotification?: boolean;

  /**
   * An optional storage to persist bot notification connections.
   *
   * @remarks
   * If `storage` is not provided, a default local file storage will be used,
   * which stores notification connections into:
   *   - ".notification.localstore.json" if running locally
   *   - "${process.env.TEMP}/.notification.localstore.json" if `process.env.RUNNING_ON_AZURE` is set to "1"
   *
   * It's recommended to use your own shared storage for production environment.
   *
   * @beta
   */
  storage?: NotificationTargetStorage;

  /**
   * The command handlers to register with the underlying conversation bot that
   * can process a command and return a response.
   *
   * @remarks
   * If provided, the corresponding handler will be involked if the bot received a message
   * that matches the command pattern (`string` or `RegExp`) defined in the handler.
   */
  commandHandlers?: TeamsFxBotCommandHandler[];
}

/**
 * Provide static utilities for bot notification.
 *
 * @remarks
 * Only work on server side.
 *
 * @example
 * Here's an example on how to send notification via Teams Bot.
 * ```typescript
 * // initialize (it's recommended to be called before handling any bot message)
 * ConversationBot.initialize(adapter);
 *
 * // get all bot installations and send message
 * for (const target of await ConversationBot.installations()) {
 *   await target.sendMessage("Hello Notification");
 * }
 *
 * // alternative - send message to all members
 * for (const target of await ConversationBot.installations()) {
 *   for (const member of await target.members()) {
 *     await member.sendMessage("Hello Notification");
 *   }
 * }
 * ```
 *
 * @beta
 */
export class ConversationBot {
  private static readonly conversationReferenceStoreKey = "teamfx-notification-targets";
  private static conversationReferenceStore: ConversationReferenceStore;
  private static adapter: BotFrameworkAdapter;

  /**
   * Initialize bot notification.
   *
   * @remarks
   * Only work on server side.
   *
   * To ensure accuracy, it's recommended to initialize before handling any message.
   *
   * @param adapter - the bound `BotFrameworkAdapter`
   * @param options - initialize options
   *
   * @beta
   */
  public static initialize(adapter: BotFrameworkAdapter, options?: ConversationOptions) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "ConversationBot"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get all targets where the bot is installed.
   *
   * @remarks
   * Only work on server side.
   *
   * The result is retrieving from the persisted storage.
   *
   * @returns - an array of {@link TeamsBotInstallation}.
   *
   * @beta
   */
  public static async installations(): Promise<TeamsBotInstallation[]> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "ConversationBot"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
