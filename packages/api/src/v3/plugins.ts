// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { AppManifest } from "../manifest";
import { QTreeNode } from "../qm/question";
import { Inputs, Json, Void } from "../types";
import { AzureAccountProvider, TokenProvider } from "../utils/login";
import { ResourceTemplate } from "../v2/resourcePlugin";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { EnvInfoV3 } from "./types";

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
export interface ContextWithManifestProvider extends Context {
  appManifestProvider: AppManifestProvider;
}
export interface OtherFeaturesAddedInputs extends InputsWithProjectPath {
  features: {
    name: string; //plugin name
    value: ResourceTemplate | undefined; //plugin addFeature result
  }[];
}

export interface FeaturePlugin {
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
   * return dependent plugin names, when adding feature
   * If plugin A depends on plugin B, when plugin A is added into the project, plugin B will also be added
   */
  pluginDependencies?(ctx: Context, inputs: Inputs): Promise<Result<string[], FxError>>;

  /**
   * questions in add feature flow
   */
  getQuestionsForAddFeature?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * triggered by add feature event, this API aims to add/modify files in local workspace
   *
   * @param {ContextWithManifestProvider} context with manifest provider
   * @param {InputsWithProjectPath} inputs with project path
   * @returns {ResourceTemplate | undefined} resource template
   */
  addFeature: (
    ctx: ContextWithManifestProvider,
    inputs: InputsWithProjectPath
  ) => Promise<Result<ResourceTemplate | undefined, FxError>>;

  /**
   * triggered after other feature(s) is/are added
   * one scenario is that when feature A is added, feature plugin B should be notified after adding feature A.
   *
   * @param {ContextWithManifestProvider} context with manifest provider
   *
   * @param {OtherFeaturesAddedInputs} inputs with added features
   *
   * @param {EnvInfoV3} envInfo optional
   *
   * @returns {ResourceTemplate | undefined} resource template
   */
  afterOtherFeaturesAdded?: (
    ctx: ContextWithManifestProvider,
    inputs: OtherFeaturesAddedInputs
  ) => Promise<Result<ResourceTemplate | undefined, FxError>>;

  /**
   * customized questions for provision
   */
  getQuestionsForProvision?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * provision includes provision local resource or remote resource
   */
  provisionResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
  /**
   * config resources includes both local and remote
   */
  configureResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * customized questions for deploy
   */
  getQuestionsForDeploy?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * deploy
   */
  deploy?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}
