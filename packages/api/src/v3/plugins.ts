// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { QTreeNode } from "../qm/question";
import { Inputs, Void } from "../types";
import { TokenProvider } from "../utils/login";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { EnvInfoV3, ManifestCapability } from "./types";

export interface AppManifestProvider {
  addCapabilities: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capabilities: ManifestCapability[]
  ) => Promise<Result<Void, FxError>>;

  updateCapability: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capability: ManifestCapability
  ) => Promise<Result<Void, FxError>>;

  deleteCapability: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capability: ManifestCapability
  ) => Promise<Result<Void, FxError>>;

  capabilityExceedLimit: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ) => Promise<Result<boolean, FxError>>;
}
export interface ContextWithManifestProvider extends Context {
  appManifestProvider: AppManifestProvider;
}

export interface AddFeatureInputs extends InputsWithProjectPath {
  allPluginsAfterAdd: string[];
}

export interface BicepTemplate extends Record<any, unknown> {
  Provision?: {
    /*
    Content of this property will be appended to templates/azure/provision.bicep
    */
    Orchestration?: string;
    /*
    Content of each modules will be appended to templates/azure/provision/${moduleFileName}.bicep
    */
    Modules?: { [moduleFileName: string]: string };
  };
  Configuration?: {
    /*
    Content of this property will be appended to templates/azure/config.bicep
    */
    Orchestration?: string;
    /*
    Content of this property override each templates/azure/teamsFx/${moduleFileName}.bicep file
    */
    Modules?: { [moduleFileName: string]: string };
  };
  /*
  The reference values you provided here will be resolved by other resource plugins in run time
  You always need to provide full reference value list in generateArmTemplate/updateArmTemplate function call
  */
  Reference?: Record<string, unknown>;
  /*
  The parameters will be merged to .fx/configs/azure.parameters.{env}.json
  All environments will be updated when you provides this parameter
  */
  Parameters?: Record<string, string>;
}

export interface UpdateInputs extends AddFeatureInputs {
  /**
   * newly added plugins
   */
  newPlugins: string[];
}

export interface AzureResourcePlugin {
  /**
   * unique identifier for plugin in IoC container
   */
  name: string;
  /**
   * display name for the plugin
   */
  displayName?: string;
  /**
   * resource description
   */
  description?: string;

  /**
   * questions asked when the resource is selected to add
   */
  getQuestionsForAddInstance?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * triggered when the resource is added,
   * in this API, plugin is supposed to:
   * 1. register itself in project settings
   * 2. add/update capabilities in manifest
   */
  addInstance?: (
    ctx: ContextWithManifestProvider,
    inputs: InputsWithProjectPath
  ) => Promise<Result<string[], FxError>>;

  /**
   * triggered when the resource is added,
   * in this API, plugin is supposed to generate source code
   */
  generateCode?: (
    ctx: ContextWithManifestProvider,
    inputs: AddFeatureInputs
  ) => Promise<Result<Void, FxError>>;

  /**
   * triggered when the resource is added,
   * in this API, plugin is supposed to generate bicep template for the resource provisioning
   */
  generateBicep?: (
    ctx: ContextWithManifestProvider,
    inputs: AddFeatureInputs
  ) => Promise<Result<BicepTemplate[], FxError>>;

  /**
   * triggered when some other resource(s) is(are) added,
   * in this API, plugin is supposed to update bicep template according to the updated context
   */
  updateBicep?: (
    ctx: ContextWithManifestProvider,
    inputs: UpdateInputs
  ) => Promise<Result<BicepTemplate[], FxError>>;

  /**
   * questions to ask for provision
   */
  getQuestionsForProvision?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * this API is for some tasks that can not be finished using arm templates
   * The API will be kept until all provision tasks can be done by template driven method
   */
  provisionResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
  /**
   * configuration of resources after provisioning finished
   */
  configureResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * questions to collect answers before deployment
   */
  getQuestionsForDeploy?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * deploy bits to the cloud
   */
  deploy?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
}

export type PluginV3 = AzureResourcePlugin;
