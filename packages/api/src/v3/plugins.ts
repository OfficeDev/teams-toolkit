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
  TeamsAppResourceProfile,
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
  name: string;
  provisionOption: OptionItem;
  runtimeStacks: RuntimeStacks[];
  dependencies: string[];
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    appResourceProfile: TeamsAppResourceProfile,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceProfile: AzureResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
