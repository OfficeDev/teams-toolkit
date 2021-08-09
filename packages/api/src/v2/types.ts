// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { UserInteraction } from "../qm/ui";
import { EnvMeta, Inputs, ProjectSettings } from "../types";
import { CryptoProvider, LogProvider, TelemetryReporter } from "../utils";

export type PluginName = string;

export interface Context {
  envMeta: EnvMeta;
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  cryptoProvider: CryptoProvider;
  projectSetting: ProjectSettings;
}

export interface LocalSettings {
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
  // Azure tenantId
  tenantId: string;
  // Azure subscriptionId
  subscriptionId: string;
  // default to East US for now
  location: string;
  teamsAppTenantId: string;
};

export type ProvisionInputs = Inputs & SolutionInputs;
export type DeploymentInputs = Inputs & SolutionInputs & { remoteTeamsAppId: string };
