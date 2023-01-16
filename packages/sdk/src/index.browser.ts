// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export { ErrorWithCode, ErrorCode } from "./core/errors";

export { AppCredential } from "./credential/appCredential.browser";
export { OnBehalfOfUserCredential } from "./credential/onBehalfOfUserCredential.browser";
export { TeamsUserCredential } from "./credential/teamsUserCredential.browser";

export { MsGraphAuthProvider } from "./core/msGraphAuthProvider";
export {
  createMicrosoftGraphClient,
  createMicrosoftGraphClientWithCredential,
} from "./core/msGraphClientProvider";
export { getTediousConnectionConfig } from "./core/defaultTediousConnectionConfiguration.browser";

export { TeamsBotSsoPrompt, TeamsBotSsoPromptSettings } from "./bot/teamsBotSsoPrompt.browser";
export { TeamsBotSsoPromptTokenResponse } from "./bot/teamsBotSsoPromptTokenResponse";

export { UserInfo } from "./models/userinfo";
export {
  AuthenticationConfiguration,
  AppCredentialAuthConfig,
  OnBehalfOfCredentialAuthConfig,
  TeamsUserCredentialAuthConfig,
} from "./models/configuration";
export { GetTeamsUserTokenOptions } from "./models/teamsUserTokenOptions";

export {
  Logger,
  LogLevel,
  LogFunction,
  setLogLevel,
  getLogLevel,
  setLogger,
  setLogFunction,
} from "./util/logger";

export { createApiClient } from "./apiClient/apiClient";
export { AxiosInstance } from "axios";
export { AuthProvider } from "./apiClient/authProvider";
export { BearerTokenAuthProvider } from "./apiClient/bearerTokenAuthProvider";
export { BasicAuthProvider } from "./apiClient/basicAuthProvider.browser";
export { ApiKeyProvider, ApiKeyLocation } from "./apiClient/apiKeyProvider.browser";
export {
  CertificateAuthProvider,
  createPemCertOption,
  createPfxCertOption,
} from "./apiClient/certificateAuthProvider.browser";

export { TeamsFx } from "./core/teamsfx.browser";
export { IdentityType } from "./models/identityType";

export {
  AdaptiveCardResponse,
  CommandMessage,
  CommandOptions,
  CardActionOptions,
  ConversationOptions,
  NotificationOptions,
  NotificationTarget,
  NotificationTargetStorage,
  NotificationTargetType,
  InvokeResponseErrorCode,
  TriggerPatterns,
  TeamsFxAdaptiveCardActionHandler,
  TeamsFxBotCommandHandler,
  TeamsFxBotSsoCommandHandler,
  BotSsoExecutionActivityHandler,
  BotSsoConfig,
  BotSsoExecutionDialogHandler,
} from "./conversation/interface";
export { ConversationBot } from "./conversation/conversation.browser";
export { BotSsoExecutionDialog } from "./conversation/sso/botSsoExecutionDialog.browser";
export {
  Channel,
  Member,
  NotificationBot,
  sendAdaptiveCard,
  sendMessage,
  TeamsBotInstallation,
} from "./conversation/notification.browser";
export { CommandBot } from "./conversation/command.browser";
export { CardActionBot } from "./conversation/cardAction.browser";
export {
  handleMessageExtensionQueryWithToken,
  handleMessageExtensionQueryWithSSO,
} from "./messageExtension/executeWithSSO.browser";
export { MessageExtensionTokenResponse } from "./messageExtension/teamsMsgExtTokenResponse";

import * as BotBuilderCloudAdapter from "./conversationWithCloudAdapter/conversationWithCloudAdapter.browser";
export { BotBuilderCloudAdapter };
