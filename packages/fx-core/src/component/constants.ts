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
  SSO: "SSO",
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

export const ComponentStateKeys = {
  [ComponentNames.AzureSQL]: "azure-sql",
  [ComponentNames.Identity]: "identity",
  [ComponentNames.AadApp]: "aad",
  [ComponentNames.KeyVault]: "key-vault",
};

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
  sqlDatabaseName: {
    key: "sqlDatabaseName",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlDatabaseName",
  },
};

export const IdentityOutputs = {
  identityResourceId: {
    key: "identityResourceId",
    bicepVariable: "provisionOutputs.identityOutput.value.identityResourceId",
  },
  identityName: {
    key: "identityName",
    bicepVariable: "provisionOutputs.identityOutput.value.identityName",
  },
  identityClientId: {
    key: "identityClientId",
    bicepVariable: "provisionOutputs.identityOutput.value.identityClientId",
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
