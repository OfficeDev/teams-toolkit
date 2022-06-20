// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Inputs, LocalSettings, PluginConfig, ProjectSettings } from "./types";

import {
  LogProvider,
  TelemetryReporter,
  AzureAccountProvider,
  TreeProvider,
  PermissionRequestProvider,
  M365TokenProvider,
} from "./utils";
import { UserInteraction } from "./qm";
import { CryptoProvider } from "./utils";
import { EnvConfig } from "./schemas/envConfig";
import { ExpServiceProvider } from "./utils/exp";

/*
 * Context will be generated by Core and carry necessary information to
 * develop a Teams APP.
 */
export interface Context {
  root: string;

  logProvider?: LogProvider;

  telemetryReporter?: TelemetryReporter;

  azureAccountProvider?: AzureAccountProvider;

  m365TokenProvider?: M365TokenProvider;

  treeProvider?: TreeProvider;

  answers?: Inputs;

  projectSettings?: ProjectSettings;

  localSettings?: LocalSettings;

  ui?: UserInteraction;

  cryptoProvider: CryptoProvider;

  permissionRequestProvider?: PermissionRequestProvider;

  expServiceProvider?: ExpServiceProvider;
}

export interface EnvInfo {
  envName: string;
  // input
  config: EnvConfig;
  // output
  state: Map<string, any>;
}

export interface SolutionContext extends Context {
  // dotVsCode?: VsCode;

  // app: TeamsAppManifest;

  envInfo: EnvInfo;
}

export interface PluginContext extends Context {
  // A readonly view of env info
  envInfo: EnvInfo;

  // A mutable config for current plugin
  config: PluginConfig;
}
