// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export { ErrorWithCode, ErrorCode } from "./core/errors";

export { AppCredential } from "./credential/appCredential.browser";
export { OnBehalfOfUserCredential } from "./credential/onBehalfOfUserCredential.browser";
export { TeamsUserCredential } from "./credential/teamsUserCredential.browser";

export { MsGraphAuthProvider } from "./core/msGraphAuthProvider";
export { createMicrosoftGraphClient } from "./core/msGraphClientProvider";
export { getTediousConnectionConfig } from "./core/defaultTediousConnectionConfiguration.browser";

export { TeamsBotSsoPrompt, TeamsBotSsoPromptSettings } from "./bot/teamsBotSsoPrompt.browser";
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

export { createApiClient } from "./authentication/ApiClient";
export { IAuthProvider } from "./authentication/IAuthProvider";
export { BasicAuthProvider } from "./authentication/BasicAuthProvider";
export { BearerAuthProvider } from "./authentication/BearerAuthProvider";
export { CertificateProvider } from "./authentication/CertificateProvider";
export { ApiKeyLocation, ApiKeyProvider } from "./authentication/ApiKeyProvider";
export { createPermCertOptions, createPfxCertOptions } from "./authentication/helper";

export { TeamsFx } from "./core/teamsfx.browser";
export { IdentityType } from "./models/identityType";
