// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { UserInteraction } from "../qm/ui";
import { Inputs, Json, ProjectSettings } from "../types";
import {
  CryptoProvider,
  LogProvider,
  TelemetryReporter,
  PermissionRequestProvider,
} from "../utils";

export type PluginName = string;

export interface Context {
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  cryptoProvider: CryptoProvider;
  projectSetting: ProjectSettings;
  permissionRequestProvider: PermissionRequestProvider;
}

export interface LocalSettings extends Json {
  teamsApp: Record<string, string>;
  auth?: Record<string, string>;
  frontend?: Record<string, string>;
  backend?: Record<string, string>;
  bot?: Record<string, string>;
}

export type LocalSetting = { key: keyof LocalSettings; value: Record<string, string> };

export type SolutionInputs = {
  resourceNameSuffix: string;
  resourceGroupName: string;
  // default to East US for now
  location: string;
  teamsAppTenantId: string;
  remoteTeamsAppId?: string;
};

export type ProvisionInputs = Inputs & SolutionInputs;
export type DeploymentInputs = Inputs & SolutionInputs;
