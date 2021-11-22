// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result, TokenProvider } from "..";
import { OptionItem } from "../qm";
import { Inputs, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import {
  CloudResource,
  LocalResource,
  RuntimeStacks,
  TeamsAppLocalResourceProfile,
  TeamsFxResourceProfile,
} from "./resourceProfile";
export interface FrameworkProvider {
  name: string;
  runtimeStacks: RuntimeStacks[];
  languages: string[];
  frameworkOptions: OptionItem[];
  scaffold: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
}

export interface SampleProvider {
  name: string;
  runtimeStacks: RuntimeStacks[];
  languages: string[];
  sampleOptions: OptionItem[];
  scaffoldSample: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
}

export interface ResourceProvider {
  name: string;
  resourceOptions: OptionItem[];
  runtimeStacks?: RuntimeStacks[];
  /**
   * return dependent components when activating plugins
   */
  getDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

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
    resourceProfile: CloudResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
