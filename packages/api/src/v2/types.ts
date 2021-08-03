// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Platform, VsCodeEnv } from "../constants";
import { UserInteraction } from "../qm/ui";
import { LogProvider, TelemetryReporter } from "../utils";

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
export interface ProjectSetting extends Json {
  name: string;
  environments: Record<string, EnvMeta>;
  currentEnv: string;
  solution: {
    name: string;
    version?: string;
  };
  solutionSetting: SolutionSetting;
}

export interface SolutionSetting extends Json {
  resourcePlugins: string[];
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
  projectSetting: ProjectSetting;
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
