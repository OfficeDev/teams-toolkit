// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { AppManifest } from "../manifest";
import { Func, QTreeNode } from "../qm/question";
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

export interface PluginScaffoldInputs extends InputsWithProjectPath {
  /**
   * scaffold template name
   */
  template: string;
  /**
   * module index
   */
  module?: string;
  /**
   * customized source root dir name
   */
  dir?: string;
  /**
   * customized build directory name
   */
  buildPath?: string;
}

export interface PluginDeployInputs extends InputsWithProjectPath {
  /**
   * root directory name
   */
  dir?: string;
  /**
   * relative path for the built artifact, it can be a folder path or a file path, depends the deployment type
   */
  buildPath?: string;
  /**
   * deployment type for bits
   */
  deployType?: string;
}

export interface Plugin {
  /**
   * unique identifier for plugin in IoC container
   */
  name: string;
  /**
   * display name for the plugin
   */
  displayName?: string;
}

export interface AppManifestProvider {
  loadManifest: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<AppManifest, FxError>>;

  saveManifest: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    manifest: AppManifest
  ) => Promise<Result<Void, FxError>>;

  addCapabilities: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capabilities: (
      | { name: "staticTab"; snippet?: Json; existing?: boolean }
      | { name: "configurableTab"; snippet?: Json; existing?: boolean }
      | { name: "Bot"; snippet?: Json; existing?: boolean }
      | {
          name: "MessageExtension";
          snippet?: Json;
          existing?: boolean;
        }
    )[]
  ) => Promise<Result<Void, FxError>>;
}

export interface ContextWithManifest extends Context {
  appManifestProvider: AppManifestProvider;
}

export interface ScaffoldPlugin extends Plugin {
  type: "scaffold";
  /**
   * Source code template descriptions
   */
  getTemplates: (ctx: Context, inputs: Inputs) => Promise<Result<ScaffoldTemplate[], FxError>>;
  /**
   * get questions before scaffolding
   */
  getQuestionsForScaffold?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * scaffold source code
   */
  scaffold: (
    ctx: ContextWithManifest,
    inputs: PluginScaffoldInputs
  ) => Promise<Result<Json | undefined, FxError>>;
}

export interface PluginAddResourceInputs extends InputsWithProjectPath {
  existingResources: string[];
}

export interface ResourcePlugin extends Plugin {
  type: "resource";
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
  addResource?: (
    ctx: ContextWithManifest,
    inputs: PluginAddResourceInputs
  ) => Promise<Result<Void, FxError>>;
  /**
   * customize questions needed for local debug
   */
  getQuestionsForLocalProvision?: (
    ctx: Context,
    inputs: Inputs,
    tokenProvider: TokenProvider,
    localSettings?: DeepReadonly<Json>
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  provisionLocalResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;

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
    tokenProvider: TokenProvider,
    envInfo?: DeepReadonly<EnvInfoV3>
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<CloudResource, FxError>>;
  configureResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  generateResourceTemplate?: (
    ctx: ContextWithManifest,
    inputs: PluginAddResourceInputs
  ) => Promise<Result<ResourceTemplate, FxError>>;
  updateResourceTemplate?: (
    ctx: ContextWithManifest,
    inputs: PluginAddResourceInputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

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
    inputs: PluginDeployInputs,
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

export interface FeaturePlugin extends Plugin {
  /**
   * resource description
   */
  description?: string;

  /**
   * return dependent plugin names, when adding feature
   * If plugin A depends on plugin B, when plugin A is added into the project, plugin B will also be added
   */
  pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

  /**
   * scaffold questions
   */
  getQuestionsForScaffold?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * scaffold source code
   */
  scaffold: (
    ctx: ContextWithManifest,
    inputs: InputsWithProjectPath
  ) => Promise<Result<Json | undefined, FxError>>;
  /**
   * generate resource template
   */
  generateResourceTemplate?: (
    ctx: ContextWithManifest,
    inputs: InputsWithProjectPath
  ) => Promise<Result<ResourceTemplate, FxError>>;
  /**
   * update resource template
   */
  updateResourceTemplate?: (
    ctx: ContextWithManifest,
    inputs: InputsWithProjectPath
  ) => Promise<Result<ResourceTemplate, FxError>>;

  /**
   * customize questions needed for local debug
   */
  getQuestionsForLocalProvision?: (
    ctx: Context,
    inputs: Inputs,
    tokenProvider: TokenProvider,
    localSettings?: DeepReadonly<Json>
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  provisionLocalResource?: (
    ctx: ContextWithManifest,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;
  configureLocalResource?: (
    ctx: ContextWithManifest,
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
    tokenProvider: TokenProvider,
    envInfo?: DeepReadonly<EnvInfoV3>
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  provisionResource?: (
    ctx: ContextWithManifest,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<CloudResource, FxError>>;
  configureResource?: (
    ctx: ContextWithManifest,
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
    inputs: PluginDeployInputs,
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
