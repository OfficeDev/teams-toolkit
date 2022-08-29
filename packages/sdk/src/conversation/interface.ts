// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  BotFrameworkAdapter,
  ConversationState,
  TeamsActivityHandler,
  UserState,
  Activity,
  TurnContext,
  Storage,
} from "botbuilder";

/**
 * The response of a message action, e.g., `sendMessage`, `sendAdaptiveCard`.
 */
export interface MessageResponse {
  /**
   * Id of the message.
   */
  id?: string;
}

/**
 * The target type where the notification will be sent to.
 *
 * @remarks
 * - "Channel" means to a team channel. (By default, notification to a team will be sent to its "General" channel.)
 * - "Group" means to a group chat.
 * - "Person" means to a personal chat.
 */
export enum NotificationTargetType {
  /**
   * The notification will be sent to a team channel.
   * (By default, notification to a team will be sent to its "General" channel.)
   */
  Channel = "Channel",
  /**
   * The notification will be sent to a group chat.
   */
  Group = "Group",
  /**
   * The notification will be sent to a personal chat.
   */
  Person = "Person",
}

/**
 * Represent a notification target.
 */
export interface NotificationTarget {
  /**
   * The type of target, could be "Channel" or "Group" or "Person".
   */
  readonly type?: NotificationTargetType;

  /**
   * Send a plain text message.
   *
   * @param text - the plain text message.
   *
   * @returns the response of sending message.
   */
  sendMessage(text: string): Promise<MessageResponse>;

  /**
   * Send an adaptive card message.
   *
   * @param card - the adaptive card raw JSON.
   *
   * @returns the response of sending adaptive card message.
   */
  sendAdaptiveCard(card: unknown): Promise<MessageResponse>;
}

/**
 * Interface for a storage provider that stores and retrieves notification target references.
 */
export interface NotificationTargetStorage {
  /**
   * Read one notification target by its key.
   *
   * @param key - the key of a notification target.
   *
   * @returns - the notification target. Or undefined if not found.
   */
  read(key: string): Promise<{ [key: string]: unknown } | undefined>;

  /**
   * List all stored notification targets.
   *
   * @returns - an array of notification target. Or an empty array if nothing is stored.
   */
  list(): Promise<{ [key: string]: unknown }[]>;

  /**
   * Write one notification target by its key.
   *
   * @param key - the key of a notification target.
   * @param object - the notification target.
   */
  write(key: string, object: { [key: string]: unknown }): Promise<void>;

  /**
   * Delete one notification target by its key.
   *
   * @param key - the key of a notification target.
   */
  delete(key: string): Promise<void>;
}

/**
 * Options to initialize {@link NotificationBot}.
 */
export interface NotificationOptions {
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
   */
  storage?: NotificationTargetStorage;
}

/**
 * The trigger pattern used to trigger a {@link TeamsFxBotCommandHandler} instance.
 */
export type TriggerPatterns = string | RegExp | (string | RegExp)[];

/**
 * Interface for a command message that can handled in a command handler.
 */
export interface CommandMessage {
  /**
   * Text of the message sent by the user.
   */
  text: string;

  /**
   * The capture groups that matched to the {@link TriggerPatterns} in a {@link TeamsFxBotCommandHandler} instance.
   */
  matches?: RegExpMatchArray;
}

/**
 * Interface for a command handler that can process command to a TeamsFx bot and return a response.
 */
export interface TeamsFxBotCommandHandler {
  /**
   * The string or regular expression patterns that can trigger this handler.
   */
  triggerPatterns: TriggerPatterns;

  /**
   * Handles a bot command received activity.
   *
   * @param context The bot context.
   * @param message The command message the user types from Teams.
   * @returns A `Promise` representing an activity or text to send as the command response.
   * Or no return value if developers want to send the response activity by themselves in this method.
   */
  handleCommandReceived(
    context: TurnContext,
    message: CommandMessage
  ): Promise<string | Partial<Activity> | void>;
}

/**
 * Interface for a command handler that can process sso command to a TeamsFx bot and return a response.
 */
export interface TeamsFxBotSsoCommandHandler {
  /**
   * command id used to create sso command dialog, if not assigned, it will generate random command id
   */
  commandId?: string;

  /**
   * The string or regular expression patterns that can trigger this handler.
   */
  triggerPatterns: TriggerPatterns;

  /**
   * Handles a bot command received activity.
   *
   * @param context The bot context.
   * @param message The command message the user types from Teams.
   * @param ssoToken The sso token which can be used to exchange access token for the bot.
   * @returns A `Promise` representing an activity or text to send as the command response.
   * Or no return value if developers want to send the response activity by themselves in this method.
   */
  handleCommandReceived(
    context: TurnContext,
    message: CommandMessage,
    ssoToken: string
  ): Promise<string | Partial<Activity> | void>;
}

/**
 * Options to initialize {@link CommandBot}.
 */
export interface CommandOptions {
  /**
   * The commands to registered with the command bot. Each command should implement the interface {@link TeamsFxBotCommandHandler} so that it can be correctly handled by this command bot.
   */
  commands?: TeamsFxBotCommandHandler[];

  /**
   * The commands to registered with the sso command bot. Each sso command should implement the interface {@link TeamsFxBotSsoCommandHandler} so that it can be correctly handled by this command bot.
   */
  ssoCommands?: TeamsFxBotSsoCommandHandler[];

  /**
   * Configurations for sso command bot
   */
  ssoConfig?: SsoConfig;
}

/**
 * Interface for SSO configuration for BotSSO
 */
export interface SsoConfig {
  /**
   * Custom sso execution activity handler class which should implement the interface {@link SsoExecutionActivityHandler}. If not provided, it will use {@link DefaultSsoExecutionActivityHandler} by default
   */
  CustomSsoExecutionActivityHandler?: new (ssoConfig: SsoConfig) => SsoExecutionActivityHandler;

  /**
   * The list of scopes for which the token will have access, if not provided, it will use graph permission ["User.Read"] by default
   */
  scopes?: string[];

  /**
   * Conversation state for sso command bot, if not provided, it will use internal memory storage to create a new one.
   */
  conversationState?: ConversationState;

  /**
   * User state for sso command bot, if not provided, it will use internal memory storage to create a new one.
   */
  userState?: UserState;

  /**
   * Used by {@link SsoExecutionDialog} to remove duplicated messages, if not provided, it will use internal memory storage
   */
  dedupStorage?: Storage;

  /**
   * Settings used to configure an teams sso prompt instance.
   */
  ssoPromptConfig?: {
    /**
     * Number of milliseconds the prompt will wait for the user to authenticate.
     * Defaults to a value `900,000` (15 minutes.)
     */
    timeout?: number;

    /**
     * Value indicating whether the TeamsBotSsoPrompt should end upon receiving an
     * invalid message.  Generally the TeamsBotSsoPrompt will end the auth flow when receives user
     * message not related to the auth flow. Setting the flag to false ignores the user's message instead.
     * Defaults to value `true`
     */
    endOnInvalidMessage?: boolean;
  };

  /**
   * teamsfx configuration for sso
   */
  teamsFxConfig?: {
    /**
     * Hostname of AAD authority, default value comes from M365_AUTHORITY_HOST environment variable.
     */
    authorityHost?: string;

    /**
     * The client (application) ID of an App Registration in the tenant, default value comes from M365_CLIENT_ID environment variable.
     */
    clientId?: string;

    /**
     * AAD tenant id, default value comes from M365_TENANT_ID environment variable.
     */
    tenantId?: string;

    /**
     * Secret string that the application uses when requesting a token. Only used in confidential client applications. Can be created in the Azure app registration portal. Default value comes from M365_CLIENT_SECRET environment variable.
     */
    clientSecret?: string;

    /**
     * The content of a PEM-encoded public/private key certificate.
     */
    certificateContent?: string;

    /**
     * Login page for Teams to redirect to.  Default value comes from INITIATE_LOGIN_ENDPOINT environment variable.
     */
    initiateLoginEndpoint?: string;

    /**
     * Application ID URI. Default value comes from M365_APPLICATION_ID_URI environment variable.
     */
    applicationIdUri?: string;
  };
}

/**
 * Options to initialize {@link ConversationBot}
 */
export interface ConversationOptions {
  /**
   * The bot adapter. If not provided, a default adapter will be created:
   * - with `adapterConfig` as constructor parameter.
   * - with a default error handler that logs error to console, sends trace activity, and sends error message to user.
   *
   * @remarks
   * If neither `adapter` nor `adapterConfig` is provided, will use BOT_ID and BOT_PASSWORD from environment variables.
   */
  adapter?: BotFrameworkAdapter;

  /**
   * If `adapter` is not provided, this `adapterConfig` will be passed to the new `BotFrameworkAdapter` when created internally.
   *
   * @remarks
   * If neither `adapter` nor `adapterConfig` is provided, will use BOT_ID and BOT_PASSWORD from environment variables.
   */
  adapterConfig?: { [key: string]: unknown };

  /**
   * The command part.
   */
  command?: CommandOptions & {
    /**
     * Whether to enable command or not.
     */
    enabled?: boolean;
  };

  /**
   * The notification part.
   */
  notification?: NotificationOptions & {
    /**
     * Whether to enable notification or not.
     */
    enabled?: boolean;
  };
}

/**
 * Interface for user to customize sso execution activity handler
 */
export interface SsoExecutionActivityHandler extends TeamsActivityHandler {
  /**
   * Add {@link TeamsFxBotSsoCommandHandler} instance to {@link SsoExecutionDialog}
   * @param handler instance of {@link TeamsFxBotSsoCommandHandler}
   */
  addCommand(handler: TeamsFxBotSsoCommandHandler): void;
}
