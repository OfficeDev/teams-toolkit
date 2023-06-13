// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { EnvInfo } from "../context";
import { UserInteraction } from "../qm/ui";
import { Inputs, Json, ProjectSettings } from "../types";
import {
  CryptoProvider,
  ExpServiceProvider,
  LogProvider,
  PermissionRequestProvider,
  TelemetryReporter,
} from "../utils";

export interface Context {
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  cryptoProvider: CryptoProvider;
  projectSetting: ProjectSettings;
  permissionRequestProvider?: PermissionRequestProvider;
  expServiceProvider?: ExpServiceProvider;
}

export interface LocalSettings extends Json {
  teamsApp: Record<string, string>;
  auth?: Record<string, string>;
  frontend?: Record<string, string>;
  backend?: Record<string, string>;
  bot?: Record<string, string>;
}

export type InputsWithProjectPath = Inputs & { projectPath: string };

export type EnvInfoV2 = Omit<EnvInfo, "state" | "config"> & { state: Json } & { config: Json };

// This type has not been supported by TypeScript yet.
// Check here https://github.com/microsoft/TypeScript/issues/13923.
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
