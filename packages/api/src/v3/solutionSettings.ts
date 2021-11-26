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
  name: "fx-solution-azure-v3",
  modules: {
    tab: {
      dir: "tabs",
      hostingPlugin: "fx-resource-azure-storage",
    },
    bot: {
      dir: "bot",
      hostingPlugin: "fx-resource-azure-web-app",
    },
    backends: [
      {
        dir: "api",
        hostingPlugin: "fx-resource-azure-function",
      },
    ],
  },
  activeResourcePlugins: [
    "fx-resource-azure-storage",
    "fx-resource-azure-web-app",
    "fx-resource-azure-function",
    "fx-resource-azure-bot",
    "fx-resource-azure-simple-auth",
    "fx-resource-azure-sql",
    "fx-resource-azure-identity",
  ],
};
