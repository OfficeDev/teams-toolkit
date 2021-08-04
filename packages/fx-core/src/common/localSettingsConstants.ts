// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const LocalSettingsTeamsAppKeys = Object.freeze({
  TenantId: "tenantId",
  TeamsAppId: "teamsAppId",
});

export const LocalSettingsAuthKeys = Object.freeze({
  AadClientId: "aadClientId",
  AadClientSecret: "aadClientSecret",
  AadObjectId: "aadObjectId",
  AadOauth2PermissionScopeId: "aadOauth2PermissionScopeId",
  AadApplicationIdUris: "aadApplicationIdUris",
  SimpleAuthFilePath: "simpleAuthFilePath",
  SimpleAuthEnvironmentVariableParams: "SimpleAuthEnvironmentVariableParams",
  SimpleAuthServiceEndpoint: "AuthServiceEndpoint",
});

export const LocalSettingsFrontendKeys = Object.freeze({
  TabDomain: "tabDomain",
  TabEndpoint: "tabEndpoint",
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
  BotAadObject: "botAadObject",
  BotRedirectUri: "botRedirectUri",
  BotDomain: "botDomain",
  BotEndpoint: "botEndpoint",
});
