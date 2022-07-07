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
  SPFx: "spfx",
  Identity: "identity",
  APIM: "apim",
  KeyVault: "key-vault",
  AzureSQL: "azure-sql",
  TabCode: "tab-code",
  BotCode: "bot-code",
  ApiCode: "api-code",
  Function: "azure-function",
  SimpleAuth: "simple-auth",
  SSO: "SSO",
};

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
    key: "resourceId",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.resourceId",
  },
  sqlEndpoint: {
    key: "endpoint",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlEndpoint",
  },
  sqlDatabaseName: {
    key: "databaseName",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlDatabaseName",
  },
};

export const IdentityOutputs = {
  identityResourceId: {
    key: "resourceId",
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
