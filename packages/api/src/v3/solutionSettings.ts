// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RuntimeStacks } from "./resourceProfile";

export interface TeamsAppPluginConfigurations {
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

export interface ComputeResourceSettings {
  type: "compute";
  innerLoopPlugin: string;
  hostingPlugin: string;
  runtimeStack: RuntimeStacks;
  dependencies: string[];
  language: string;
}

export interface AdditionalResourceSettings {
  type: "additional";
  hostingPlugin: string;
  dependencies: string[];
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
    [key: string]: AdditionalResourceSettings | ComputeResourceSettings;
  };
}

const solutionSettings: TeamsAppSolutionSettings = {
  capabilities: ["Tab", "Bot"],
  tab: "Tab#1",
  bot: "Bot#1",
  resources: {
    "Tab#1": {
      type: "compute",
      innerLoopPlugin: "TabBotScaffoldPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      hostingPlugin: "AzureWebAppPluginName",
      dependencies: ["FunctionApp#1", "FunctionApp#2"],
      language: "javascript",
    },
    "Bot#1": {
      type: "compute",
      innerLoopPlugin: "TabBotScaffoldPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      hostingPlugin: "AzureWebAppPluginName", // bot plugin is built-in plugin
      dependencies: ["AzureSql#1"],
      language: "javascript",
    },
    "FunctionApp#1": {
      type: "compute",
      innerLoopPlugin: "AzureFunctionPlugin",
      hostingPlugin: "AzureFunctionPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      dependencies: ["AzureSql#1", "Tab#1"],
      language: "javascript",
    },
    "FunctionApp#2": {
      type: "compute",
      innerLoopPlugin: "AzureFunctionPlugin",
      hostingPlugin: "AzureFunctionPlugin",
      runtimeStack: RuntimeStacks.Node12LTS,
      dependencies: ["Tab#1"],
      language: "javascript",
    },
    "AzureSql#1": {
      type: "additional",
      hostingPlugin: "AzureSQLPluginName",
      dependencies: ["ManagedIdentity#1"],
    },
    "ManagedIdentity#1": {
      type: "additional",
      hostingPlugin: "ManagedIdentityPluginName",
      dependencies: [],
    },
  },
};

// console.log(solutionSettings);
