// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Func, QTreeNode } from "..";
import { Platform } from "../constants";
import { FxError } from "../error";
import { Inputs, Json, Void } from "../types";
import { AzureAccountProvider, TokenProvider } from "../utils/login";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { CloudResource } from "./resourceStates";
import { EnvInfoV3 } from "./types";

/**
 * Description of scaffolding templates
 */
export interface ScaffoldTemplate {
  /**
   * unique identifier for the template
   */
  name: string;
  /**
   * programming language
   */
  language: string;
  /**
   * description of the template
   */
  description: string;
}

export interface ScaffoldInputs extends InputsWithProjectPath {
  /**
   * scaffold template name
   */
  templateName: string;
  /**
   * customized source root dir name
   */
  dir?: string;
  /**
   * customized build directory name
   */
  buildPath?: string;
}

export interface Plugin {
  /**
   * unique identifier for plugin
   */
  name: string;
  /**
   * display name for the plugin
   */
  displayName?: string;
}

export interface ScaffoldPlugin extends Plugin {
  /**
   * Source code template descriptions
   */
  getTemplates: (ctx: Context, inputs: Inputs) => Promise<Result<ScaffoldTemplate[], FxError>>;
  /**
   * get questions before scaffolding
   */
  getQuestionsForScaffolding?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * scaffold source code
   */
  scaffold: (ctx: Context, inputs: ScaffoldInputs) => Promise<Result<Json | undefined, FxError>>;
}

export interface ResourcePlugin extends Plugin {
  /**
   * resource type the plugin provide
   */
  resourceType: string;
  /**
   * resource description
   */
  description?: string;
  /**
   * return dependent plugin names, when adding resource, the toolkit will add all dependent resources
   */
  pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

  /**
   * customize questions needed for add resource operation
   */
  getQuestionsForAddResource?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * add resource is a new lifecycle task for resource plugin, which will do some extra work after project settings is updated,
   * for example, APIM will scaffold the openapi folder with files
   */
  addResource?: (ctx: Context, inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
  /**
   * customize questions needed for local debug
   */
  getQuestionsForLocalProvision?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: DeepReadonly<Json>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  provisionLocalResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  configureLocalResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
  /**
   * customize questions needed for provision
   */
  getQuestionsForProvision?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<CloudResource, FxError>>;

  generateResourceTemplate?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<ResourceTemplate, FxError>>;
  updateResourceTemplate?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<ResourceTemplate, FxError>>;
  configureResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
  /**
   * customize questions needed for deploy
   */
  getQuestionsForDeploy?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  deploy?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
  /**
   * customize questions needed for user task
   */
  getQuestionsForUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  executeUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<unknown, FxError>>;
}
