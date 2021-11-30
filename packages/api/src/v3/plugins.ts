// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Func, ProjectSettings, QTreeNode, v2 } from "..";
import { FxError } from "../error";
import { Inputs, Json, Void } from "../types";
import { AzureAccountProvider, TokenProvider } from "../utils/login";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { DeepReadonly, EnvInfoV2, InputsWithProjectPath } from "../v2/types";
import { ResourceStates } from "./resourceStates";
import { Modules, TeamsFxSolutionSettings } from "./solutionSettings";

/**
 * Upgrade EnvInfoV2, specify the state type as ResourceStates
 */
export interface EnvInfoV3 extends EnvInfoV2 {
  state: ResourceStates;
}

export interface ProjectSettingsV3 extends ProjectSettings {
  solutionSettings: TeamsFxSolutionSettings;
}

export interface ContextV3 extends v2.Context {
  projectSetting: ProjectSettingsV3;
}

export interface ScaffoldTemplate {
  id: string;
  /**
   * programming language
   */
  language: string;
  /**
   * description of the template
   */
  description: string;
  /**
   * what module does the template work for
   */
  modules: (keyof Modules)[];
}

export interface ScaffoldInputs extends InputsWithProjectPath {
  /**
   * scaffold template id
   */
  templateId: string;
  /**
   * programming language
   */
  language?: string;
  /**
   * customized source root dir name
   */
  dir?: string;
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
  templates: ScaffoldTemplate[];
  /**
   * get questions before scaffolding
   */
  getQuestionsForScaffolding?: (
    ctx: ContextV3,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * scaffold source code
   */
  scaffold: (ctx: ContextV3, inputs: ScaffoldInputs) => Promise<Result<Void, FxError>>;
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
   * what module does the resource works for, if not specified, there is no limit
   */
  modules?: (keyof Modules)[];
  /**
   * return dependent plugin names, when adding resource, the toolkit will add all dependent resources
   */
  pluginDependencies?(ctx: ContextV3, inputs: Inputs): Promise<Result<string[], FxError>>;

  /**
   * customize questions needed for add resource operation
   */
  getQuestionsForAddResource?: (
    ctx: ContextV3,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * add resource is a new lifecycle task for resource plugin, which will do some extra work after project settings is updated,
   * for example, APIM will scaffold the openapi folder with files
   */
  addResource?: (ctx: ContextV3, inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;

  getQuestionsForLocalProvision?: (
    ctx: ContextV3,
    inputs: Inputs,
    localSettings: DeepReadonly<Json>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  provisionLocalResource?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  configureLocalResource?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  getQuestionsForProvision?: (
    ctx: ContextV3,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  provisionResource?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<EnvInfoV3, FxError>>;

  generateResourceTemplate?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath
  ) => Promise<Result<ResourceTemplate, FxError>>;

  configureResource?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  getQuestionsForDeploy?: (
    ctx: ContextV3,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  deploy?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  getQuestionsForUserTask?: (
    ctx: ContextV3,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  executeUserTask?: (
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    func: Func,
    localSettings: Json,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<unknown, FxError>>;
}
