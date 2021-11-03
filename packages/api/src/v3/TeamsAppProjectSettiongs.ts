// Copyright (c) Microsoft Corporation.

import { RuntimeStacks } from "./AzureResource";

// Licensed under the MIT license.
export interface TeamsAppPluginSettings {
  tab: {
    innerLoopPlugins: string[];
    hostingPlugins: string[];
    resourcePlugins: string[];
  };
  bot: {
    innerLoopPlugins: string[];
    hostingPlugins: string[];
    resourcePlugins: string[];
  };
}

export interface ComputingResource {
  type: "compute";
  innerLoopPlugin: string;
  hostingPlugin: string;
  runtimeStack: RuntimeStacks;
  dependentResources: string[];
  programmingLanguage: string;
}

export interface AdditionalResourceSettings {
  type: "additional";
  hostingPlugin: string;
  dependentResources: string[];
}

/**
 * solution settings will defines:
 * 1. the resource structure that TeamsApp consists of
 * 2. what extensible plugin (innerLoop or hosting) is used for each resource, built-in plugins will not appear in this settings
 * 3. the dependencies between resources
 */
export interface TeamsAppSolutionSettings {
  capabilities: ("Tab" | "Bot" | "MessagingExtension")[];
  tab: string;
  bot: string;
  resources: {
    [key: string]: AdditionalResourceSettings | ComputingResource;
  };
}

const projectSettings: TeamsAppSolutionSettings = {
  capabilities: ["Tab", "Bot"],
  tab: "Tab#1",
  bot: "Bot#1",
  resources: {
    "Tab#1": {
      type: "compute",
      innerLoopPlugin: "TabReactPluginName",
      runtimeStack: RuntimeStacks.Node12LTS,
      hostingPlugin: "AzureStoragePluginName",
      dependentResources: ["FunctionApp#1", "FunctionApp#2"],
      programmingLanguage: "javascript",
    },
    "Bot#1": {
      type: "compute",
      innerLoopPlugin: "BotScaffoldPluginName",
      runtimeStack: RuntimeStacks.Node12LTS,
      hostingPlugin: "AzureWebAppPluginName", // bot plugin is built-in plugin
      dependentResources: ["AzureSql#1"],
      programmingLanguage: "javascript",
    },
    "FunctionApp#1": {
      type: "compute",
      innerLoopPlugin: "AzureFunctionPlugin",
      hostingPlugin: "AzureFunctionPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      dependentResources: ["AzureSql#1", "Tab#1"],
      programmingLanguage: "javascript",
    },
    "FunctionApp#2": {
      type: "compute",
      innerLoopPlugin: "AzureFunctionPlugin",
      hostingPlugin: "AzureFunctionPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      dependentResources: ["Tab#1"],
      programmingLanguage: "javascript",
    },
    "AzureSql#1": {
      type: "additional",
      hostingPlugin: "AzureSQLPluginName",
      dependentResources: ["ManagedIdentity#1"],
    },
    "ManagedIdentity#1": {
      type: "additional",
      hostingPlugin: "ManagedIdentityPluginName",
      dependentResources: [],
    },
  },
};

console.log(projectSettings);

/**
 * 1. One scaffold plugin can scaffold both Tab and Bot
 * 2. Both Tab and Bot reuse one Web app instance
 * 3. How to define cycle dependencies of config, function app depends on Tab endpoint
 * 4. SQL database depends on identity?
 */
