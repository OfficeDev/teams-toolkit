// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { Inputs, Json, Void } from "../types";
import { AzureAccountProvider, TokenProvider } from "../utils/login";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeepReadonly } from "../v2/types";
import { ResourceStates } from "./resourceModel";

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
export interface EnvInfoV3 {
  envName: string;
  // input
  config: Json;
  // output
  state: ResourceStates;
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

  /**
   * For example, add resource of APIM, this method will scaffold some openapi files
   */
  scaffold?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  configureLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<EnvInfoV3, FxError>>;

  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

  configureResource?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  deploy?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
