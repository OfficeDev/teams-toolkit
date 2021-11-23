// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result, TokenProvider } from "..";
import { OptionItem } from "../qm";
import { Inputs, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import {
  LocalResource,
  LocalResourceState,
  TeamsAppLocalResourceState as LocalResourceProfile,
} from "./localResourceStates";
import { CloudResource, ResourceStates } from "./resourceStates";
import { RuntimeStacks } from "./solutionSettings";

export interface ScaffoldOption extends OptionItem {
  data: {
    runtimeStack: string;
    language: string;
    tags: string[];
    scope: ("tab" | "bot" | "backend")[];
  };
}

export interface ScaffoldPlugin {
  name: string;
  options: ScaffoldOption[];
  scaffold: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
}

export interface ResourcePlugin {
  name: string;
  option: OptionItem;
  runtimeStacks?: RuntimeStacks[];
  /**
   * return dependent plugin names
   */
  pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    tokenProvider: TokenProvider,
    teamsAppLocalResourceProfile?: LocalResourceProfile
  ) => Promise<Result<LocalResource, FxError>>;

  //all plugins are built-in plugins: aad, appStudio, localDebug, simpleAuth, bot
  configureLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localResourceState: LocalResourceState,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    tokenProvider: TokenProvider,
    resourceState?: CloudResource
  ) => Promise<Result<CloudResource, FxError>>;

  /// after add resource
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs /// specific inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    resourceStates: ResourceStates,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceProfile: CloudResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
