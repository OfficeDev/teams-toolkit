// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export class LocalDebugPluginInfo {
    public static readonly pluginName: string = "fx-resource-local-debug";
    public static readonly displayName: string = "LocalDebug Plugin";
}

export class LaunchBrowser {
    public static readonly chrome: string = "pwa-chrome";
    public static readonly edge: string = "pwa-msedge";
}

export class LocalDebugCertificate {
    public static readonly CertFileName: string = "localhost.crt";
    public static readonly KeyFileName: string = "localhost.key";
    public static readonly FriendlyName: string = "TeamsFx Development Certificate";
}

export enum ProgrammingLanguage {
    javascript = "javascript",
    typescript = "typescript",
}

/**
 * Config key contract that value is provided by local debug plugin and required by other plugins.
 */
export class LocalDebugConfigKeys {
    public static readonly LocalAuthEndpoint: string = "localAuthEndpoint";

    public static readonly LocalTabEndpoint: string = "localTabEndpoint";
    public static readonly LocalTabDomain: string = "localTabDomain";

    public static readonly LocalFunctionEndpoint: string = "localFunctionEndpoint";

    public static readonly LocalBotEndpoint: string = "localBotEndpoint";
    public static readonly LocalBotDomain: string = "localBotDomain";
    public static readonly SkipNgrok: string = "skipNgrok";
}

export class AadPlugin {
    public static readonly Name: string = "fx-resource-aad-app-for-teams";
    public static readonly LocalAppIdUri: string = "local_applicationIdUris";
    public static readonly LocalClientId: string = "local_clientId";
    public static readonly LocalClientSecret: string = "local_clientSecret";
    public static readonly TeamsMobileDesktopAppId: string = "teamsMobileDesktopAppId";
    public static readonly TeamsWebAppId: string = "teamsWebAppId";
}

export class FunctionPlugin {
    public static readonly Name: string = "fx-resource-function";
    public static readonly DefaultFunctionName: string = "defaultFunctionName";
}

export class RuntimeConnectorPlugin {
    public static readonly Name: string = "fx-resource-simple-auth";
    public static readonly FilePath: string = "filePath";
}

export class SpfxPlugin {
    public static readonly Name: string = "fx-resource-spfx";
}

export class SolutionPlugin {
    public static readonly Name: string = "solution";
    // public static readonly SelectedPlugins: string = "selectedPlugins";
    public static readonly LocalTeamsAppId: string = "localDebugTeamsAppId";
    public static readonly RemoteTeamsAppId: string = "remoteTeamsAppId";
    public static readonly TeamsAppTenantId: string = "teamsAppTenantId";
    public static readonly ProgrammingLanguage: string = "programmingLanguage";
}

export class FrontendHostingPlugin {
    public static readonly Name: string = "fx-resource-frontend-hosting";
}

export class BotPlugin {
    public static readonly Name: string = "fx-resource-bot";
    public static readonly LocalBotId: string = "localBotId";
    public static readonly LocalBotPassword: string = "localBotPassword";
}

export const LocalEnvFrontendKeys = Object.freeze({
    Browser: "FRONTEND_BROWSER",
    Https: "FRONTEND_HTTPS",
    TeamsFxEndpoint: "FRONTEND_REACT_APP_TEAMSFX_ENDPOINT",
    LoginUrl: "FRONTEND_REACT_APP_START_LOGIN_PAGE_URL",
    FuncEndpoint: "FRONTEND_REACT_APP_FUNC_ENDPOINT",
    FuncName: "FRONTEND_REACT_APP_FUNC_NAME",
    ClientId: "FRONTEND_REACT_APP_CLIENT_ID",
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

export const LocalEnvCertKeys = Object.freeze({
    SslCrtFile: "FRONTEND_SSL_CRT_FILE",
    SslKeyFile: "FRONTEND_SSL_KEY_FILE",
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
