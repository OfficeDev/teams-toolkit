// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const LocalSettingsTeamsAppKeys = Object.freeze({
  TenantId: "tenantId",
  TeamsAppId: "teamsAppId",
});

export const LocalSettingsAuthKeys = Object.freeze({
  ClientId: "clientId",
  ClientSecret: "clientSecret",
  ObjectId: "objectId",
  Oauth2PermissionScopeId: "oauth2PermissionScopeId",
  OauthAuthority: "oauthAuthority",
  OauthHost: "oauthHost",
  ApplicationIdUris: "applicationIdUris",
  SimpleAuthFilePath: "simpleAuthFilePath",
  SimpleAuthEnvironmentVariableParams: "SimpleAuthEnvironmentVariableParams",
  SimpleAuthServiceEndpoint: "AuthServiceEndpoint",
});

export const LocalSettingsFrontendKeys = Object.freeze({
  TabDomain: "tabDomain",
  TabEndpoint: "tabEndpoint",
  TabIndexPath: "tabIndexPath",
  Browser: "browser",
  Https: "https",
  TrustDevCert: "trustDevCert",
  SslCertFile: "sslCertFile",
  SslKeyFile: "sslKeyFile",
});

export const LocalSettingsBackendKeys = Object.freeze({
  FunctionEndpoint: "functionEndpoint",
  FunctionName: "functionName",
  SqlEndpoint: "sqlEndpoint",
  SqlDatabaseName: "sqlDatabaseName",
  SqlUserName: "sqlUserName",
  SqlPassword: "sqlPassword",
});

export const LocalSettingsBotKeys = Object.freeze({
  SkipNgrok: "skipNgrok",
  BotId: "botId",
  BotPassword: "botPassword",
  BotAadObjectId: "botAadObjectId",
  BotRedirectUri: "botRedirectUri",
  BotDomain: "botDomain",
  BotEndpoint: "botEndpoint",
});

export const LocalSettingsEncryptKeys = Object.freeze({
  ClientSecret: "clientSecret",
  SimpleAuthEnvironmentVariableParams: "SimpleAuthEnvironmentVariableParams",
  BotPassword: "botPassword",
});
