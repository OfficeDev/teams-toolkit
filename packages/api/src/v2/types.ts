// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Platform, VsCodeEnv } from "../constants";
import { UserInteraction } from "../qm/ui";
import { CryptoProvider, LogProvider, TelemetryReporter } from "../utils";

// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};

/**
 * environment meta data
 */
export interface EnvMeta {
  name: string;
  local: boolean;
  sideloading: boolean;
}

export type Json = Record<string, unknown>;
export type PluginName = string;

/**
 * project static setting
 */
export interface ProjectSettings extends Json {
  appName: string;
  version?: string;
  projectId: string;
  programmingLanguage?: string;
  solutionSettings?: SolutionSettings;
}

export interface SolutionSettings extends Json {
  name: string;
  version?: string;
}

export interface AzureSolutionSettings extends SolutionSettings {
  hostType: string;
  capabilities: string[];
  azureResources: string[];
  activeResourcePlugins: string[];
}

export interface Inputs extends Json {
  projectPath?: string;
  targetEnvName?: string;
  platform: Platform;
  stage: Stage;
  vscodeEnv?: VsCodeEnv;
  ignoreLock?: boolean;
  ignoreTypeCheck?: boolean;
  ignoreConfigPersist?: boolean;
}

export interface Context {
  envMeta: EnvMeta;
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  cryptoProvider: CryptoProvider;
  projectSetting: ProjectSettings;
}

export enum Stage {
  create = "create",
  build = "build",
  debug = "debug",
  provision = "provision",
  deploy = "deploy",
  package = "package",
  publish = "publish",
  createEnv = "createEnv",
  removeEnv = "removeEnv",
  switchEnv = "switchEnv",
  userTask = "userTask",
}

export interface LocalSettings {
  teamsApp: Record<string, string>;
  auth?: Record<string, string>;
  frontend?: Record<string, string>;
  backend?: Record<string, string>;
  bot?: Record<string, string>;
}

export type LocalSetting = { key: keyof LocalSettings; value: Record<string, string> };
