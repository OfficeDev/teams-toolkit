// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result, TokenProvider } from "..";
import { OptionItem } from "../qm";
import { Inputs, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import {
  AzureResource,
  LocalResource,
  RuntimeStacks,
  TeamsAppLocalResourceProfile,
  TeamsFxResourceProfile,
} from "./resourceProfile";
import { Dependency } from "./solutionSettings";
export interface ScaffoldingPlugin {
  name: string;
  runtimeStacks: RuntimeStacks[];
  languages: string[];
  moduleOption: OptionItem;
  scaffoldSourceCode?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
}

export interface ContainerHostingPlugin {
  name: string;
  hostingOption: OptionItem;
  runtimeStacks?: RuntimeStacks[];
  /**
   * return dependent components when activating plugins
   */
  getDependencies(ctx: Context, inputs: Inputs): Promise<Result<Dependency[], FxError>>;
  //all plugins are built-in plugins: aad, appStudio, localDebug, simpleAuth, bot
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
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;
  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    appResourceProfile: TeamsFxResourceProfile,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceProfile: AzureResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}

export interface ResourceHostingPlugin {
  name: string;
  hostingOption: OptionItem;
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;
}
