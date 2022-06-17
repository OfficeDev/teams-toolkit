// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export class FolderName {
  static readonly Frontend = "tabs";
  static readonly Bot = "bot";
  static readonly Function = "api";
  static readonly SPFx = "SPFx";
}

export enum ProgrammingLanguage {
  javascript = "javascript",
  typescript = "typescript",
}

export const npmInstallCommand = "npm install --no-audit";

export const LocalEnvAuthKeys = Object.freeze({
  ClientId: "AUTH_CLIENT_ID",
  ClientSecret: "AUTH_CLIENT_SECRET",
  IdentifierUri: "AUTH_IDENTIFIER_URI",
  AadMetadataAddress: "AUTH_AAD_METADATA_ADDRESS",
  OauthAuthority: "AUTH_OAUTH_AUTHORITY",
  TabEndpoint: "AUTH_TAB_APP_ENDPOINT",
  AllowedAppIds: "AUTH_ALLOWED_APP_IDS",
  Urls: "AUTH_urls",
  ServicePath: "AUTH_SERVICE_PATH",
});

export const LocalEnvBackendKeys = Object.freeze({
  WebJobsStorage: "BACKEND_AzureWebJobsStorage",
  FuncWorkerRuntime: "BACKEND_FUNCTIONS_WORKER_RUNTIME",
  AuthorityHost: "BACKEND_M365_AUTHORITY_HOST",
  TenantId: "BACKEND_M365_TENANT_ID",
  ClientId: "BACKEND_M365_CLIENT_ID",
  ClientSecret: "BACKEND_M365_CLIENT_SECRET",
  SqlEndpoint: "BACKEND_SQL_ENDPOINT",
  SqlDbName: "BACKEND_SQL_DATABASE_NAME",
  SqlUserName: "BACKEND_SQL_USER_NAME",
  SqlPassword: "BACKEND_SQL_PASSWORD",
  IdentityId: "BACKEND_IDENTITY_ID",
  ApiEndpoint: "BACKEND_API_ENDPOINT",
  ApplicationIdUri: "BACKEND_M365_APPLICATION_ID_URI",
  AllowedAppIds: "BACKEND_ALLOWED_APP_IDS",
});

export const LocalEnvBotKeys = Object.freeze({
  BotId: "BOT_BOT_ID",
  BotPassword: "BOT_BOT_PASSWORD",
  ClientId: "BOT_M365_CLIENT_ID",
  ClientSecret: "BOT_M365_CLIENT_SECRET",
  TenantID: "BOT_M365_TENANT_ID",
  OauthAuthority: "BOT_M365_AUTHORITY_HOST",
  LoginEndpoint: "BOT_INITIATE_LOGIN_ENDPOINT",
  SqlEndpoint: "BOT_SQL_ENDPOINT",
  SqlDbName: "BOT_SQL_DATABASE_NAME",
  SqlUserName: "BOT_SQL_USER_NAME",
  SqlPassword: "BOT_SQL_PASSWORD",
  IdentityId: "BOT_IDENTITY_ID",
  ApiEndpoint: "BOT_API_ENDPOINT",
  ApplicationIdUri: "BOT_M365_APPLICATION_ID_URI",
});

export const LocalEnvCertKeys = Object.freeze({
  SslCrtFile: "FRONTEND_SSL_CRT_FILE",
  SslKeyFile: "FRONTEND_SSL_KEY_FILE",
});

export const LocalEnvFrontendKeys = Object.freeze({
  Browser: "FRONTEND_BROWSER",
  Https: "FRONTEND_HTTPS",
  Port: "FRONTEND_PORT",
  TeamsFxEndpoint: "FRONTEND_REACT_APP_TEAMSFX_ENDPOINT",
  LoginUrl: "FRONTEND_REACT_APP_START_LOGIN_PAGE_URL",
  FuncEndpoint: "FRONTEND_REACT_APP_FUNC_ENDPOINT",
  FuncName: "FRONTEND_REACT_APP_FUNC_NAME",
  ClientId: "FRONTEND_REACT_APP_CLIENT_ID",
});

export class LocalDebugCertificate {
  public static readonly CertFileName: string = "localhost.crt";
  public static readonly KeyFileName: string = "localhost.key";
  public static readonly FriendlyName: string = "TeamsFx Development Certificate";
}

export const BotHostTypeName = "host-type";
export const BotHostTypes = Object.freeze({
  AppService: "app-service",
  AzureFunctions: "azure-functions",
});

export const BotCapabilities = "capabilities";
