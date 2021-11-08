// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result, TokenProvider } from "..";
import { OptionItem } from "../qm";
import { Inputs, Json, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import {
  AzureResource,
  LocalResource,
  RuntimeStacks,
  TeamsAppLocalResourceProfile,
} from "./resourceProfile";
export interface InnerLoopPlugin {
  name: string;
  scaffoldOption: OptionItem;
  runtimeStacks: RuntimeStacks[];
  languages: string[];

  scaffoldSourceCode?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

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
}

export interface HostingPlugin {
  provisionOption: OptionItem;
  runtimeStacks: RuntimeStacks[];
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

  //only for built-in plugin (AAD)
  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    tokenProvider: AzureAccountProvider,
    resourceProfile?: AzureResource
  ) => Promise<Result<AzureResource, FxError>>;

  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    resourceProfile: AzureResource,
    configs: Record<string, string>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceProfile: AzureResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
