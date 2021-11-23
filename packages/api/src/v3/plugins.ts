// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result, TokenProvider } from "..";
import { OptionItem } from "../qm";
import { Inputs, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import { LocalResource, TeamsAppLocalResourceProfile } from "./localResourceProfile";
import { CloudResource, ResourceProfile } from "./resourceProfile";
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
  subFolderName?: string;
  scaffold: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
}

export interface ResourceProvider {
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
    teamsAppLocalResourceProfile?: TeamsAppLocalResourceProfile
  ) => Promise<Result<LocalResource, FxError>>;

  //all plugins are built-in plugins: aad, appStudio, localDebug, simpleAuth, bot
  configureLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    teamsAppLocalResourceProfile: TeamsAppLocalResourceProfile,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    tokenProvider: TokenProvider,
    resourceProfile?: CloudResource
  ) => Promise<Result<CloudResource, FxError>>;

  /// after add resource
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs /// specific inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    appResourceProfile: ResourceProfile,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceProfile: CloudResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
