// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureResourceTypes, RuntimeStacks } from "./AzureResource";

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

export interface TeamsAppProjectSettings {
  capabilities: ("Tab" | "Bot" | "MessagingExtension")[];
  tab: ComputingResource;
  bot: ComputingResource;
  resources: {
    [key: string]: DatabaseResource | ComputingResource;
  };
}

const projectSettings: TeamsAppProjectSettings = {
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
