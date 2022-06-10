// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const ComponentNames = {
  TeamsTab: "teams-tab",
  TeamsBot: "teams-bot",
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
  Function: "function",
  SimpleAuth: "simple-auth",
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
