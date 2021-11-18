// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json } from "../types";

export enum RuntimeStacks {
  DoNet_6_EA = ".NET 6(Early Access)",
  DoNet_5 = ".NET 5",
  DoNet_Core_3_1 = ".NET Core 3.1(LTS)",
  ASP_DoNET_V48 = "ASP.NET V4.8",
  ASP_DoNET_V35 = "ASP.NET V3.5",
  Node12LTS = "Node 12 LTS",
  Node14LTS = "Node 14 LTS",
}

export enum AzureResourceTypes {
  WebApp = "Web App",
  StaticWebApp = "Static Web App",
  FunctionApp = "Function App",
  ManagedIdentity = "Managed Identity",
  StorageAccount = "Storage account",
  AzureBot = "Azure Bot",
  AzureSQLDatabase = "SQL database",
  AzureActiveDirectoryApp = "AAD App",
}

/**
 * defines the provision output of HostingPlugin
 */
export interface AzureResource extends Json {
  type: string;
  name: string;
  resourceId: string; //resourceId
  resourceName: string;
  endpoint?: string;
  skuName?: string;
  secretFields?: string[];

  //some resource can have customized resource group
  resourceGroupName?: string;
  subscriptionId?: string;
  tenantId?: string;
  location?: string;
}

export interface AzureManagedIdentity extends AzureResource {
  type: AzureResourceTypes.ManagedIdentity;
  clientId: string;
}

export interface AzureStorageAccount extends AzureResource {
  type: AzureResourceTypes.StorageAccount;
  endpoint: string;
}

export interface AzureSQLDatabase extends AzureResource {
  type: AzureResourceTypes.AzureSQLDatabase;
  endpoint: string;
  adminUserName: string;
  databaseName: string;
}

export interface AzureBot extends AzureResource {
  type: AzureResourceTypes.AzureBot;
  endpoint: string;
  botId: string;
  botPassword: string;
  aadObjectId: string; //bot AAD App Id
  appServicePlan: string; // use for deploy
  botChannelReg: string; // Azure Bot
  botRedirectUri?: string; // ???
}

export interface WebApp extends AzureResource {
  type: AzureResourceTypes.WebApp;
  endpoint: string;
}

export interface AzureActiveDirectoryApp extends AzureResource {
  type: AzureResourceTypes.AzureActiveDirectoryApp;
  clientId: string;
  clientSecret: string;
  objectId: string;
  oauth2PermissionScopeId: string;
  tenantId: string;
  oauthHost: string;
  oauthAuthority: string;
  applicationIdUris: string;
}

export interface AzureCommonConfig {
  resourceNameSuffix: string;
  resourceGroupName: string;
  tenantId: string;
  subscriptionId: string;
  subscriptionName: string;
  location: string;
  provisionSucceeded: boolean;
}

export interface TeamsAppResource extends Json {
  teamsAppId: string;
  tenantId: string;
}

export interface LocalResource extends Json {
  type: string;
  endpoint?: string;
  secretFields?: string[];
}

export interface LocalFrontendResource extends LocalResource {
  type: "Local Frontend";
  browser: string;
  https: boolean;
  trustDevCert: boolean;
  sslCertFile: string;
  sslKeyFile: string;
  endpoint: string;
}

export interface LocalSimpleAuthResource extends LocalResource {
  type: "Local Simple Auth";
  filePath: string;
  environmentVariableParams: string;
  endpoint: string;
}

export interface LocalBotResource extends LocalResource {
  type: "Local Bot";
  skipNgrok: boolean;
  botId: string;
  botPassword: string;
  aadObjectId: string;
  botRedirectUri?: string; // ???
  endpoint: string;
}

/**
 * defines: provision cloud resource profiles
 */
export interface TeamsFxResourceProfile {
  solution: AzureCommonConfig;
  tab?: AzureResource;
  bot?: AzureBot;
  resources?: AzureResource[];
  aad?: AzureActiveDirectoryApp;
  teamsApp: TeamsAppResource;
}

/**
 * defines local resource profiles
 */
export interface TeamsAppLocalResourceProfile {
  tab?: LocalFrontendResource;
  bot?: LocalBotResource;
  resources?: LocalResource[];
  aad?: AzureActiveDirectoryApp;
  teamsApp: TeamsAppResource;
}

/**
 * example of TeamsAppResourceProfile
 */
const resourceProfile: TeamsFxResourceProfile = {
  solution: {
    resourceNameSuffix: "595516",
    resourceGroupName: "fullcap-dev-rg",
    tenantId: "9f3429dc-50f4-44df-af81-f1078d49a57a",
    subscriptionId: "63f43cd3-ab63-429d-80ad-950ec8359724",
    subscriptionName: "Visual Studio Enterprise Subscription",
    location: "Central US",
    provisionSucceeded: true,
  },
  tab: {
    name: "tab",
    type: AzureResourceTypes.StorageAccount,
    resourceId:
      "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Storage/storageAccounts/frontendstgwtdxzjx6olulg",
    resourceName: "frontendstgwtdxzjx6olulg",
    endpoint: "https://frontendstgwtdxzjx6olulg.z19.web.core.windows.net",
  },
  bot: {
    name: "bot",
    type: AzureResourceTypes.AzureBot,
    resourceId:
      "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Web/sites/fullcapdev230e29-bot-sites", //resourceId
    resourceName: "fullcapdev230e29-bot-sites",
    endpoint: "https://fullcapdev230e29-bot-sites.azurewebsites.net",
    botId: "baaec4f5-8c99-4ba5-b896-376ab8d519fa",
    botPassword: "xxxx",
    aadObjectId: "3067c7a1-8584-4cd4-8093-febf0ae378ab", //bot AAD App Id
    appServicePlan: "fullcapdev230e29-bot-serverfarms", // use for deploy
    botChannelReg: "fullcapdev230e29-bot-service", // Azure Bot
  },
  aad: {
    name: "simpleAuth",
    type: AzureResourceTypes.AzureActiveDirectoryApp,
    resourceId: "3154034a-4ce1-48f7-809f-e8dd91ac5b4c",
    resourceName: "xxxaad",
    clientId: "0a9f0107-a78a-40a9-9740-812b1f13bf37",
    clientSecret: "{{fx-resource-aad-app-for-teams.clientSecret}}",
    objectId: "1d4be2b5-ee59-4ca6-a03e-c84bd49c6075",
    oauth2PermissionScopeId: "c883327a-4435-4bc8-bced-f57542f2c94e",
    tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
    oauthHost: "https://login.microsoftonline.com",
    oauthAuthority: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47",
    applicationIdUris:
      "api://frontendstgwtdxzjx6olulg.z19.web.core.windows.net/botid-baaec4f5-8c99-4ba5-b896-376ab8d519fa",
  },
  teamsApp: {
    teamsAppId: "3949bacf-b098-4b03-9bb1-ca94196c90f8",
    tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
  },

  resources: [
    {
      name: "simpleAuth",
      type: AzureResourceTypes.WebApp,
      resourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Web/serverfarms/fullcapdev230e29-simpleAuth-serverfarms",
      resourceName: "fullcapdev230e29-simpleauth-webapp",
      endpoint: "https://fullcapdev230e29-simpleauth-webapp.azurewebsites.net",
    },
    {
      name: "myFunctionApp",
      type: AzureResourceTypes.FunctionApp,
      resourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Web/sites/fullcap102dev517e3f-function-webapp",
      resourceName: "fullcapdev230e29-simpleauth-webapp",
      endpoint: "https://fullcapdev230e29-simpleauth-webapp.azurewebsites.net",
    },
    {
      name: "sql1",
      type: AzureResourceTypes.AzureSQLDatabase,
      resourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Sql/servers/fullcapdev230e29-sql-server",
      resourceName: "fullcapdev230e29-sql-server",
      endpoint: "fullcapdev230e29-sql-server.database.windows.net",
      adminUserName: "huajiez",
      databaseName: "fullcapdev230e29-database",
    },
    {
      name: "Identity1",
      type: AzureResourceTypes.ManagedIdentity,
      resourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/fullcap102dev517e3f-managedIdentity",
      resourceName: "fullcap102dev517e3f-managedIdentity",
      clientId: "bab9c110-d477-4cd4-9903-a01e426ec68a",
    },
  ],
};
