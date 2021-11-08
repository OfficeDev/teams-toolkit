// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result, TokenProvider } from "..";
import { OptionItem } from "../qm";
import { Inputs, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import { AzureResource, RuntimeStacks, TeamsAppLocalResourceProfile } from "./resourceProfile";
export interface InnerLoopPlugin {
  name: string;
  scaffoldOption: OptionItem;
  runtimeStacks: RuntimeStacks[];
  languages: string[];
  scaffoldSourceCode: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: TeamsAppLocalResourceProfile,
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
  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    tokenProvider: AzureAccountProvider,
    resourceManifest?: AzureResource
  ) => Promise<Result<AzureResource, FxError>>;
  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    configs: Record<string, string>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceManifest: AzureResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
