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

export interface DatabaseResource {
  type: "database";
  hostingPlugin: string;
}

/**
 * solution settings will defines:
 * 1. the resource structure that TeamsApp consists of
 * 2. what extensible plugin (innerLoop or hosting) is used for each resource, built-in plugins will not appear in this settings
 * 3. the dependencies between resources
 */
export interface TeamsAppSolutionSettings {
  capabilities: ("Tab" | "Bot" | "MessagingExtension")[];
  tab: ComputingResource;
  bot: ComputingResource;
  resources: {
    [key: string]: DatabaseResource | ComputingResource;
  };
}

const projectSettings: TeamsAppSolutionSettings = {
  capabilities: ["Tab"],
  tab: {
    type: "compute",
    innerLoopPlugin: "TabReactPluginName",
    runtimeStack: RuntimeStacks.Node12LTS,
    hostingPlugin: "AzureStoragePluginName",
    dependentResources: ["FunctionApp#1", "FunctionApp#2"],
    programmingLanguage: "javascript",
  },
  bot: {
    type: "compute",
    innerLoopPlugin: "BotScaffoldPluginName",
    runtimeStack: RuntimeStacks.Node12LTS,
    hostingPlugin: "AzureWebAppPluginName", // bot plugin is built-in plugin
    dependentResources: [],
    programmingLanguage: "javascript",
  },
  resources: {
    "FunctionApp#1": {
      type: "compute",
      innerLoopPlugin: "AzureFunctionPlugin",
      hostingPlugin: "AzureFunctionPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      dependentResources: ["AzureSql#1"],
      programmingLanguage: "javascript",
    },
    "FunctionApp#2": {
      type: "compute",
      innerLoopPlugin: "AzureFunctionPlugin",
      hostingPlugin: "AzureFunctionPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      dependentResources: [],
      programmingLanguage: "javascript",
    },
    "AzureSql#1": {
      type: "database",
      hostingPlugin: "AzureSQLPluginName",
    },
  },
};

console.log(projectSettings);
