// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result } from "..";
import { Inputs, Void } from "../types";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import { AzureResource, RuntimeStacks } from "./AzureResource";

export interface HostingPlugin {
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
