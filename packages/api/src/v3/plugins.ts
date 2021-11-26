// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { Inputs, Void } from "../types";
import { AzureAccountProvider, TokenProvider } from "../utils/login";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import { LocalResource, LocalResourceStates } from "./localResourceStates";
import { CloudResource, ResourceStates } from "./resourceModel";

export interface ScaffoldTemplate {
  id: string;
  language: string;
  description: string;
  tags: string[];
  modules: string[];
}

export interface ScaffoldInputs extends Inputs {
  templateId: string;
  language: string;
  dir?: string;
}

export interface ScaffoldPlugin {
  /**
   * unique identifier for plugin
   */
  name: string;
  /**
   * Source code template descriptions
   */
  templates: ScaffoldTemplate[];
  /**
   * scaffold source code
   */
  scaffold: (ctx: Context, inputs: ScaffoldInputs) => Promise<Result<Void, FxError>>;
}

export interface ResourcePlugin {
  /**
   * unique identifier for plugin
   */
  name: string;
  /**
   * resource type the plugin provide
   */
  resourceType: string;
  /**
   * resource description
   */
  description?: string;
  /**
   * scopes for resource to add
   * if not defined, no limitation
   */
  modules?: string[];
  /**
   * return dependent plugin names, when adding resource, the toolkit will add all dependent resources
   */
  pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    tokenProvider: TokenProvider,
    localResourceStates?: LocalResourceStates
  ) => Promise<Result<LocalResource, FxError>>;

  configureLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localResourceState: LocalResourceStates,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    tokenProvider: TokenProvider,
    resourceState?: CloudResource
  ) => Promise<Result<CloudResource, FxError>>;

  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs /// parameters schema?
  ) => Promise<Result<ResourceTemplate, FxError>>;

  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    envState: ResourceStates,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    envState: CloudResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
