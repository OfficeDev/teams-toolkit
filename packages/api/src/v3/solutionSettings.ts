// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, Json } from "../types";

/**
 * Module is basic building block of the App
 */
export interface Module extends Json {
  /**
   * module directory name
   */
  dir?: string;
  /**
   * directory name for build artifacts
   */
  buildDir?: string;
  hostingPlugin?: string;
}

export interface TeamsFxSolutionSettings extends AzureSolutionSettings {
  version: "3.0.0";
  modules: {
    tab?: Module;
    bot?: Module;
    backends?: Module[];
  };
}

/**
 * case1: nodejs tab + nodejs bot + function + sql + simpleauth + aad
 */
const settings1: TeamsFxSolutionSettings = {
  version: "3.0.0",
  hostType: "",
  capabilities: [],
  azureResources: [],
  name: "TeamsFxSolutionPlugin",
  modules: {
    tab: {
      dir: "tabs",
      hostingPlugin: "AzureStoragePlugin",
    },
    bot: {
      dir: "bot",
      hostingPlugin: "AzureWebAppPlugin",
    },
    backends: [
      {
        dir: "api",
        hostingPlugin: "AzureFunctionPlugin",
      },
    ],
  },
  activeResourcePlugins: [
    "AzureStoragePlugin",
    "AzureWebAppPlugin",
    "AzureFunctionPlugin",
    "AzureBotPlugin",
    "SimpleAuthPlugin",
    "AzureSQLPlugin",
    "ManagedIdentityPlugin",
  ],
};
