// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export { ErrorWithCode, ErrorCode } from "./core/errors";

export { AppCredential } from "./credential/appCredential";
export { OnBehalfOfUserCredential } from "./credential/onBehalfOfUserCredential";
export { TeamsUserCredential } from "./credential/teamsUserCredential";

export { MsGraphAuthProvider } from "./core/msGraphAuthProvider";
export {
  createMicrosoftGraphClient,
  createMicrosoftGraphClientWithCredential,
} from "./core/msGraphClientProvider";
export { getTediousConnectionConfig } from "./core/defaultTediousConnectionConfiguration";

export { TeamsBotSsoPrompt, TeamsBotSsoPromptSettings } from "./bot/teamsBotSsoPrompt";
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
export { BasicAuthProvider } from "./apiClient/basicAuthProvider";
export { ApiKeyProvider, ApiKeyLocation } from "./apiClient/apiKeyProvider";
export {
  CertificateAuthProvider,
  createPemCertOption,
  createPfxCertOption,
} from "./apiClient/certificateAuthProvider";

export { TeamsFx } from "./core/teamsfx";
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
export { ConversationBot } from "./conversation/conversation";
export { BotSsoExecutionDialog } from "./conversation/sso/botSsoExecutionDialog";
export {
  Channel,
  Member,
  NotificationBot,
  sendAdaptiveCard,
  sendMessage,
  TeamsBotInstallation,
  SearchScope,
} from "./conversation/notification";
export { CommandBot } from "./conversation/command";
export { CardActionBot } from "./conversation/cardAction";
export { MessageBuilder } from "./conversation/messageBuilder";
export { InvokeResponseFactory } from "./conversation/invokeResponseFactory";
export {
  handleMessageExtensionQueryWithToken,
  handleMessageExtensionQueryWithSSO,
} from "./messageExtension/executeWithSSO";
export { MessageExtensionTokenResponse } from "./messageExtension/teamsMsgExtTokenResponse";

import * as BotBuilderCloudAdapter from "./conversationWithCloudAdapter/conversationWithCloudAdapter";
export { BotBuilderCloudAdapter };
