// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Plugin, PluginContext } from "@microsoft/teamsfx-api";

export type LoadedPlugin = Plugin;
export type PluginsWithContext = [LoadedPlugin, PluginContext];

// Maybe we need a state machine to track state transition.
export enum SolutionRunningState {
  Idle = "idle",
  ProvisionInProgress = "ProvisionInProgress",
  DeployInProgress = "DeployInProgress",
  PublishInProgress = "PublishInProgress",
}
