// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const LocalStateTeamsAppKeys = Object.freeze({
  TeamsAppId: "teamsAppId",
});

export const LocalStateAuthKeys = Object.freeze({
  ClientId: "clientId",
  ClientSecret: "clientSecret",
  ObjectId: "objectId",
  Oauth2PermissionScopeId: "oauth2PermissionScopeId",
  OauthAuthority: "oauthAuthority",
  OauthHost: "oauthHost",
  ApplicationIdUris: "applicationIdUris",
  TenantId: "tenantId",
});

export const LocalStateSimpleAuthKeys = Object.freeze({
  SimpleAuthFilePath: "simpleAuthFilePath",
  EnvironmentVariableParams: "environmentVariableParams",
  Endpoint: "endpoint",
});

export const LocalStateFrontendKeys = Object.freeze({
  TabDomain: "tabDomain",
  TabEndpoint: "tabEndpoint",
  TabIndexPath: "tabIndexPath",
  Browser: "browser",
  Https: "https",
  SslCertFile: "sslCertFile",
  SslKeyFile: "sslKeyFile",
  Endpoint: "endpoint",
});

export const LocalStateBackendKeys = Object.freeze({
  FunctionEndpoint: "functionEndpoint",
});

export const LocalStateBotKeys = Object.freeze({
  BotId: "botId",
  BotPassword: "botPassword",
  BotAadObjectId: "botAadObjectId",
  BotDomain: "botDomain",
  BotEndpoint: "botEndpoint",
});
