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

export { createApiClient } from "./authentication/ApiClient";
export { IAuthProvider } from "./authentication/IAuthProvider";
export { BasicAuthProvider } from "./authentication/BasicAuthProvider";
export { BearerAuthProvider } from "./authentication/BearerAuthProvider";
export { CertificateProvider } from "./authentication/CertificateProvider";
export { ApiKeyLocation, ApiKeyProvider } from "./authentication/ApiKeyProvider";
export { createPermCertOptions, createPfxCertOptions } from "./authentication/helper";

export { TeamsFx } from "./core/teamsfx";
export { IdentityType } from "./models/identityType";
