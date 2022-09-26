// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const ComponentNames = {
  TeamsTab: "teams-tab",
  TeamsBot: "teams-bot",
  TeamsApi: "teams-api",
  AppManifest: "app-manifest",
  AadApp: "aad-app",
  AzureWebApp: "azure-web-app",
  AzureStorage: "azure-storage",
  BotService: "bot-service",
  SPFxTab: "spfx-tab",
  SPFx: "spfx",
  Identity: "identity",
  APIMFeature: "apim-feature",
  APIM: "apim",
  KeyVault: "key-vault",
  AzureSQL: "azure-sql",
  TabCode: "tab-code",
  BotCode: "bot-code",
  SPFxTabCode: "spfx-tab-code",
  ApiCode: "api-code",
  Function: "azure-function",
  SimpleAuth: "simple-auth",
  SSO: "sso",
  ApiConnector: "api-connector",
  CICD: "cicd",
};

export const AzureResources = [
  ComponentNames.APIM,
  ComponentNames.AzureWebApp,
  ComponentNames.Function,
  ComponentNames.Identity,
  ComponentNames.KeyVault,
  ComponentNames.AzureSQL,
  ComponentNames.AzureStorage,
];

export enum Scenarios {
  Tab = "Tab",
  Bot = "Bot",
  Api = "Api",
}

export const componentToScenario = new Map([
  [ComponentNames.TeamsApi, Scenarios.Api],
  [ComponentNames.TeamsBot, Scenarios.Bot],
  [ComponentNames.TeamsTab, Scenarios.Tab],
]);

export const scenarioToComponent = new Map([
  [Scenarios.Api, ComponentNames.TeamsApi],
  [Scenarios.Bot, ComponentNames.TeamsBot],
  [Scenarios.Tab, ComponentNames.TeamsTab],
]);

export enum ProgrammingLanguage {
  JS = "javascript",
  TS = "typescript",
  CSharp = "csharp",
}

export enum Runtime {
  nodejs = "node",
  dotnet = "dotnet",
}

export const languageToRuntime = new Map([
  [ProgrammingLanguage.JS, Runtime.nodejs],
  [ProgrammingLanguage.TS, Runtime.nodejs],
  [ProgrammingLanguage.CSharp, Runtime.dotnet],
]);

export const ActionNames = {
  provision: "provision",
  configure: "configure",
  generateBicep: "generateBicep",
};

export const ActionTypeFunction = "function";
export const ActionTypeCall = "call";
export const ActionTypeGroup = "group";
export const ActionTypeShell = "shell";

export const BicepConstants = {
  writeFile: "1",
};

export const TelemetryConstants = {
  eventPrefix: "-start",
  properties: {
    component: "component",
    appId: "appid",
    tenantId: "tenant-id",
    success: "success",
    errorCode: "error-code",
    errorType: "error-type",
    errorMessage: "error-message",
  },
  values: {
    yes: "yes",
    no: "no",
    userError: "user",
    systemError: "system",
  },
};

export const ErrorConstants = {
  unhandledError: "UnhandledError",
  unhandledErrorMessage: "Unhandled Error",
};

export const AzureSqlOutputs = {
  sqlResourceId: {
    key: "sqlResourceId",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlResourceId",
  },
  sqlEndpoint: {
    key: "sqlEndpoint",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlEndpoint",
  },
  databaseName: {
    key: "databaseName",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.databaseName",
  },
};

export const IdentityOutputs = {
  identityResourceId: {
    key: "identityResourceId",
    bicepVariable: "userAssignedIdentityProvision.outputs.identityResourceId",
  },
  identityName: {
    key: "identityName",
    bicepVariable: "provisionOutputs.identityOutput.value.identityName",
  },
  identityClientId: {
    key: "identityClientId",
    bicepVariable: "provisionOutputs.identityOutput.value.identityClientId",
  },
  identityPrincipalId: {
    key: "identityPrincipalId",
    bicepVariable: "userAssignedIdentityProvision.outputs.identityPrincipalId",
  },
};

export const KeyVaultOutputs = {
  keyVaultResourceId: {
    key: "keyVaultResourceId",
    bicepVariable: "provisionOutputs.keyVaultOutput.value.keyVaultResourceId",
  },
  m365ClientSecretReference: {
    key: "m365ClientSecretReference",
    bicepVariable: "provisionOutputs.keyVaultOutput.value.m365ClientSecretReference",
  },
  botClientSecretReference: {
    key: "botClientSecretReference",
    bicepVariable: "provisionOutputs.keyVaultOutput.value.botClientSecretReference",
  },
};

export const APIMOutputs = {
  serviceResourceId: {
    key: "serviceResourceId",
    bicepVariable: "provisionOutputs.apimOutput.value.serviceResourceId",
  },
  productResourceId: {
    key: "productResourceId",
    bicepVariable: "provisionOutputs.apimOutput.value.productResourceId",
  },
  authServerResourceId: {
    key: "authServerResourceId",
  },
  apimClientAADObjectId: {
    key: "apimClientAADObjectId",
  },
  apimClientAADClientId: {
    key: "apimClientAADClientId",
  },
  apimClientAADClientSecret: {
    key: "apimClientAADClientSecret",
  },
};

export const WebAppOutputs = {
  resourceId: {
    key: "resourceId",
    bicepVariable: "provisionOutputs.azureWebApp{{scenario}}Output.value.resourceId",
  },
  endpoint: {
    key: "siteEndpoint",
    bicepVariable: "provisionOutputs.azureWebApp{{scenario}}Output.value.siteEndpoint",
  },
  endpointAsParam: {
    key: "siteEndpointAsParam",
    bicepVariable: "azureWebApp{{scenario}}Provision.outputs.siteEndpoint",
  },
};

export const FunctionOutputs = {
  resourceId: {
    key: "functionAppResourceId",
    bicepVariable: "provisionOutputs.azureFunction{{scenario}}Output.value.functionAppResourceId",
  },
  endpoint: {
    key: "functionEndpoint",
    bicepVariable: "provisionOutputs.azureFunction{{scenario}}Output.value.functionEndpoint",
  },
  endpointAsParam: {
    key: "functionEndpointAsParam",
    bicepVariable: "azureFunction{{scenario}}Provision.outputs.functionEndpoint",
  },
};

export const StorageOutputs = {
  endpoint: {
    key: "endpoint",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.endpoint",
  },
  storageResourceId: {
    key: "storageResourceId",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.storageResourceId",
  },
  domain: {
    key: "domain",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.domain",
  },
  indexPath: {
    key: "indexPath",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.indexPath",
  },
};

export const BotServiceOutputs = {
  botId: {
    key: "botId",
  },
  botPassword: {
    key: "botPassword",
  },
};

export const AadAppOutputs = {
  applicationIdUris: {
    key: "applicationIdUris",
  },
  clientId: {
    key: "clientId",
  },
  clientSecret: {
    key: "clientSecret",
  },
  objectId: {
    key: "objectId",
  },
  oauth2PermissionScopeId: {
    key: "oauth2PermissionScopeId",
  },
  frontendEndpoint: {
    key: "frontendEndpoint",
  },
  botId: {
    key: "botId",
  },
  botEndpoint: {
    key: "botEndpoint",
  },
  domain: {
    key: "domain",
  },
  endpoint: {
    key: "endpoint",
  },
  oauthAuthority: {
    key: "oauthAuthority",
  },
  oauthHost: {
    key: "oauthHost",
  },
  tenantId: {
    key: "tenantId",
  },
};

export const FunctionAppSetting = {
  keys: {
    allowedAppIds: "ALLOWED_APP_IDS",
  },
  allowedAppIdSep: ";",
};

export const PathConstants = {
  botWorkingDir: "bot",
  apiWorkingDir: "api",
  npmPackageFolderName: "node_modules",
  functionExtensionsFolderName: "bin",
  functionExtensionsFileName: "extensions.csproj",
};
