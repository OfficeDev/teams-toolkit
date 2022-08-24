// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export { ErrorWithCode, ErrorCode } from "./core/errors";

export { AppCredential } from "./credential/appCredential";
export { OnBehalfOfUserCredential } from "./credential/onBehalfOfUserCredential";
export { TeamsUserCredential } from "./credential/teamsUserCredential";

export { MsGraphAuthProvider } from "./core/msGraphAuthProvider";
export { createMicrosoftGraphClient } from "./core/msGraphClientProvider";
export { getTediousConnectionConfig } from "./core/defaultTediousConnectionConfiguration";

export { TeamsBotSsoPrompt, TeamsBotSsoPromptSettings } from "./bot/teamsBotSsoPrompt";
export { TeamsBotSsoPromptTokenResponse } from "./bot/teamsBotSsoPromptTokenResponse";

export { UserInfo } from "./models/userinfo";
export { AuthenticationConfiguration } from "./models/configuration";

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

export { 
  TeamsFx, 
  OBOUserCredentialClientSecretConfig, 
  OBOUserCredentialCertificateContentConfig, 
  AppCredentialClientSecretConfig, 
  AppCredentialCertificateContentConfig 
} from "./core/teamsfx";
export { IdentityType } from "./models/identityType";

export {
  CommandOptions,
  ConversationOptions,
  NotificationOptions,
  NotificationTarget,
  NotificationTargetStorage,
  NotificationTargetType,
  CommandMessage,
  TriggerPatterns,
  TeamsFxBotCommandHandler,
} from "./conversation/interface";
export { ConversationBot } from "./conversation/conversation";
export {
  Channel,
  Member,
  NotificationBot,
  sendAdaptiveCard,
  sendMessage,
  TeamsBotInstallation,
} from "./conversation/notification";
export { CommandBot } from "./conversation/command";
export { MessageBuilder } from "./conversation/messageBuilder";
