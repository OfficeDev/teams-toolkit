// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class CommonStrings {
    public static readonly BOT_WORKING_DIR_NAME = 'bot';
    public static readonly DEFAULT_FILE_ENCODING = 'utf-8';

    public static readonly APP_SERVICE_PLAN = 'app service plan';
    public static readonly AZURE_WEB_APP = 'azure web app';
    public static readonly BOT_CHANNEL_REGISTRATION = 'azure bot channel registration';
    public static readonly MS_TEAMS_CHANNEL = 'ms teams channel';
    public static readonly AAD_APP = 'aad app';
    public static readonly AAD_CLIENT_SECRET = 'add client secret';
    public static readonly CONFIG_ITEM = 'config item';
    public static readonly SHORT_APP_NAME = 'short app name';
}

export class PluginAAD {
    public static readonly PLUGIN_NAME = 'teamsfx-resource-aad-app-for-teams';
    public static readonly CLIENT_ID = 'clientId';
    public static readonly CLIENT_SECRET = 'clientSecret';
}

export class PluginLocalDebug {
    public static readonly PLUGIN_NAME = 'teamsfx-resource-local-debug';
    public static readonly LOCAL_BOT_ENDPOINT = 'localBotEndpoint';
}

export class PluginSolution {
    public static readonly PLUGIN_NAME = 'solution';
    public static readonly SUBSCRIPTION_ID = 'subscriptionId';
    public static readonly RESOURCE_GROUP_NAME = 'resourceGroupName';
    public static readonly LOCATION = 'location';
    public static readonly TENANT_ID = 'tenantId';
}

export class TelemetryStrings {
    public static readonly COMPONENT_NAME = 'teamsfx-resource-teamsbot';
}

export class ConfigNames {
    public static readonly PROGRAMMING_LANGUAGE = 'programming language';
    public static readonly GRAPH_TOKEN = 'graph token';
    public static readonly SUBSCRIPTION_ID = 'subscription id';
    public static readonly SERVICE_CLIENT_CREDENTIALS = 'service client credentials';
    public static readonly LOCATION = 'location';
    public static readonly RESOURCE_GROUP = 'resource group';
    public static readonly LOCAL_ENDPOINT = 'local endpoint';

    public static readonly AUTH_CLIENT_ID = 'auth client id';
    public static readonly AUTH_CLIENT_SECRET = 'auth client secret';
    public static readonly AUTH_TENANT = 'auth tenant';
    public static readonly SITE_ENDPOINT = 'site endpoint';

}

export class Commands {
    public static readonly NPM_INSTALL = 'npm install';
    public static readonly NPM_BUILD = 'npm run build';
}

export class ClientNames {
    public static readonly WEB_SITE_MGMT_CLIENT = 'webSiteMgmtClient';
    public static readonly BOT_SERVICE_CLIENT = 'botServiceClient';
}