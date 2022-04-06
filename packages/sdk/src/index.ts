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

export { TeamsFx } from "./core/teamsfx";
export { IdentityType } from "./models/identityType";

export {
  NotificationTarget,
  NotificationTargetStorage,
  NotificationTargetType,
  TeamsFxBotCommandHandler,
  NotificationOptions,
} from "./conversation/interface";

export {
  Channel,
  Member,
  sendAdaptiveCard,
  sendMessage,
  TeamsBotInstallation,
} from "./conversation/notification";

export { NotificationBot } from "./conversation/notification";
export { CommandBot } from "./conversation/command";
export { MessageBuilder } from "./conversation/messageBuilder";
