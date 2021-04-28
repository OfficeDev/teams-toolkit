// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export { ErrorWithCode, ErrorCode } from "./core/errors";
export { M365TenantCredential } from "./credential/m365TenantCredential";
export { OnBehalfOfUserCredential } from "./credential/onBehalfOfUserCredential";
export { TeamsUserCredential } from "./credential/teamsUserCredential";
export { MsGraphAuthProvider } from "./core/msGraphAuthProvider";
export { UserInfo } from "./models/userinfo";
export { TeamsBotSsoPrompt, TeamsBotSsoPromptSettings } from "./bot/teamsBotSsoPrompt";
export { TeamsBotSsoPromptTokenResponse } from "./bot/teamsBotSsoPromptTokenResponse";
export {
  getAuthenticationConfiguration,
  getResourceConfiguration,
  loadConfiguration
} from "./core/configurationProvider";
export {
  Configuration,
  AuthenticationConfiguration,
  ResourceConfiguration,
  ResourceType
} from "./models/configuration";
export { createMicrosoftGraphClient } from "./core/msGraphClientProvider";
export { DefaultTediousConnectionConfiguration } from "./core/sqlConnector";
export { TokenCredential, GetTokenOptions } from "@azure/identity";
export {
  Logger,
  LogLevel,
  LogFunction,
  setLogLevel,
  getLogLevel,
  setLogger,
  setLogFunction
} from "./util/logger";
