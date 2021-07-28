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

export interface ProjectState extends Json {
  solutionState: Json;
}

export interface Inputs extends Json {
  stage?: Stage;
  vscodeEnv?: VsCodeEnv;
  ignoreLock?: boolean;
  ignoreTypeCheck?: boolean;
  ignoreConfigPersist?: boolean;
}

export interface Context {
  envMeta: EnvMeta;
  projectPath: string;
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  projectSetting: ProjectSetting;
  projectState: ProjectState;
  projectSecrets: Json;
  solutionConfig: Json;
  platform: Platform;
}

/**
 * project config model
 */
export interface ProjectConfigs {
  projectSetting: ProjectSetting;
  projectState: ProjectState;
  provisionTemplates?: Record<string, Json>;
  deployTemplates?: Record<string, Json>;
  provisionConfigs?: Record<string, Json>;
  deployConfigs?: Record<string, Json>;
  resourceInstanceValues?: Record<string, string>;
  stateValues?: Record<string, string>;
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
  update = "update", //never used again except APIM just for reference
}
