// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json, SolutionSettings } from "../types";

export enum RuntimeStacks {
  DoNet_6_EA = ".NET 6(Early Access)",
  DoNet_5 = ".NET 5",
  DoNet_Core_3_1 = ".NET Core 3.1(LTS)",
  ASP_DoNET_V48 = "ASP.NET V4.8",
  ASP_DoNET_V35 = "ASP.NET V3.5",
  Node12LTS = "Node 12 LTS",
  Node14LTS = "Node 14 LTS",
}

export interface Module extends Json {
  runtimeStack?: RuntimeStacks;
  language?: string;
  resources?: string[];
  subFolderName?: string;
}

export interface Resource extends Json {
  /**
   * unique name
   */
  name: string;
  /**
   * plugin name
   */
  provider: string;
  /**
   * bicep files
   */
  // provisionBicepFile?: string;
  // configurationBicepFile?: string;
}

export interface TeamsFxSolutionSettings extends SolutionSettings {
  modules: {
    tab?: Module;
    bot?: Module;
    backend?: Module;
  };
  resources?: Resource[];
}

/**
 * case1: nodejs tab + nodejs bot + function + sql + simpleauth + aad
 */
const settings1: TeamsFxSolutionSettings = {
  name: "TeamsFxSolutionPlugin",
  modules: {
    tab: {
      runtimeStack: RuntimeStacks.Node12LTS,
      language: "javascript",
      subFolderName: "tabs",
      resources: ["AzureStorageAccount_1"],
    },
    bot: {
      runtimeStack: RuntimeStacks.Node12LTS,
      language: "javascript",
      subFolderName: "bot",
      resources: ["AzureBot_1", "AzureWebApp_1"],
    },
    backend: {
      runtimeStack: RuntimeStacks.Node12LTS,
      language: "javascript",
      subFolderName: "api",
      resources: ["AzureFunction_1"],
    },
  },
  resources: [
    {
      name: "AzureStorageAccount_1",
      type: "AzureStorageAccount",
      provider: "AzureStorageAccountPlugin",
      provisionBicepFile: "templates/azure/AzureStorageAccount_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureStorageAccount_1.configuration.bicep",
    },
    {
      name: "AzureBot_1",
      type: "AzureBot",
      provider: "AzureBotPlugin",
      provisionBicepFile: "templates/azure/AzureBot_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureBot_1.configuration.bicep",
    },
    {
      name: "AzureWebApp_1",
      type: "AzureWebApp",
      provider: "AzureWebAppPlugin",
      provisionBicepFile: "templates/azure/AzureWebApp_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureWebApp_1.configuration.bicep",
    },
    {
      name: "AzureFunction_1",
      type: "AzureFunction",
      provider: "AzureFunctionPlugin",
      provisionBicepFile: "templates/azure/AzureFunction_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureFunction_1.configuration.bicep",
    },
    {
      name: "SimpleAuth",
      provider: "SimpleAuthPlugin",
      resources: ["AzureWebApp_1"],
      provisionBicepFile: "templates/azure/SimpleAuth.provision.bicep",
      configurationBicepFile: "templates/azure/SimpleAuth.configuration.bicep",
    },
    {
      name: "AAD",
      type: "AAD",
      provider: "AADPlugin",
    },
    {
      name: "AzureSQL_1",
      type: "AzureSQL",
      provider: "AzureSQLPlugin",
      provisionBicepFile: "templates/azure/AzureSQL_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureSQL_1.configuration.bicep",
    },
    {
      name: "ManagedIdentity_1",
      type: "ManagedIdentity",
      provider: "ManagedIdentityPlugin",
      provisionBicepFile: "templates/azure/ManagedIdentity_1.provision.bicep",
      configurationBicepFile: "templates/azure/ManagedIdentity_1.configuration.bicep",
    },
  ],
};

/**
 * csharp tab + csharp bot (share the same web app)
 */
const settings2: TeamsFxSolutionSettings = {
  name: "TeamsFxSolutionPlugin",
  modules: {
    tab: {
      runtimeStack: RuntimeStacks.DoNet_5,
      language: "csharp",
      subFolderName: "tabs",
      resources: ["AzureWebApp_1"],
    },
    bot: {
      runtimeStack: RuntimeStacks.DoNet_5,
      language: "csharp",
      subFolderName: "bot",
      resources: ["AzureBot_1", "AzureWebApp_1"],
    },
  },
  resources: [
    {
      name: "AzureBot_1",
      type: "AzureBot",
      provider: "AzureBotPlugin",
      provisionBicepFile: "templates/azure/AzureBot_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureBot_1.configuration.bicep",
    },
    {
      name: "AzureWebApp_1",
      type: "AzureWebApp",
      provider: "AzureWebAppPlugin",
      provisionBicepFile: "templates/azure/AzureWebApp_1.provision.bicep",
      configurationBicepFile: "templates/azure/AzureWebApp_1.configuration.bicep",
    },
  ],
};

/**
 * csharp tab + csharp bot (don't share the same web app)
 */
const settings3: TeamsFxSolutionSettings = {
  name: "TeamsFxSolutionPlugin",
  modules: {
    tab: {
      runtimeStack: RuntimeStacks.DoNet_5,
      language: "csharp",
      subFolderName: "tabs",
      resources: ["AzureWebApp_1"],
    },
    bot: {
      runtimeStack: RuntimeStacks.DoNet_5,
      language: "csharp",
      subFolderName: "bot",
      resources: ["AzureBot_1", "AzureWebApp_2"],
    },
  },
  resources: [
    {
      name: "AzureBot_1",
      type: "AzureBot",
      provider: "AzureBotPlugin",
    },
    {
      name: "AzureWebApp_1",
      type: "AzureWebApp",
      provider: "AzureWebAppPlugin",
    },
    {
      name: "AzureWebApp_2",
      type: "AzureWebApp",
      provider: "AzureWebAppPlugin",
    },
  ],
};
