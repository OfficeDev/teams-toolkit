// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { Inputs, Void } from "../types";
import { AzureAccountProvider, TokenProvider } from "../utils/login";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeploymentInputs, ProvisionInputs } from "../v2/types";
import { LocalResource, LocalResourceState } from "./localResourceStates";
import { CloudResource, ResourceStates } from "./resourceStates";
import { RuntimeStacks } from "./solutionSettings";

export interface ScaffoldTemplate {
  id: string;
  runtimeStack: string;
  language: string;
  tags: string[];
  modules: string[];
}

export interface ScaffoldInputs extends Inputs {
  templateId: string;
  runtimeStack: RuntimeStacks;
  language: string;
  subFolderName: string;
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
   */
  modules?: string[];
  /**
   * for compute
   */
  runtimeStacks?: RuntimeStacks[];
  /**
   * return dependent plugin names, when adding resource, the toolkit will add all dependent resources
   */
  pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    tokenProvider: TokenProvider,
    teamsAppLocalResourceProfile?: LocalResourceState
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

  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs /// parameters schema?
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
