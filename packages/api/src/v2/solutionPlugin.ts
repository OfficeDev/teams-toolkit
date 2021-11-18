// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow";
import {
  DeepReadonly,
  DeploymentInputs,
  InputsWithProjectPath,
  ProvisionInputs,
  ResourceProvisionOutput,
} from ".";
import { Stage } from "../constants";
import { EnvInfo } from "../context";
import {
  AppStudioTokenProvider,
  AzureAccountProvider,
  Func,
  FxError,
  Inputs,
  QTreeNode,
  TokenProvider,
  Void,
} from "../index";
import { Json } from "../types";
import { Context, EnvInfoV2, FxResult } from "./types";

export type SolutionProvisionOutput = Record<string, ResourceProvisionOutput>;

export interface SolutionPlugin {
  name: string;

  displayName: string;

  /**
   * Called by Toolkit when creating a new project or adding a new resource.
   * Scaffolds source code on disk, relative to context.projectPath.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User answers to questions defined in {@link getQuestionsForScaffolding} along with some system inputs.
   *
   * @returns scaffold return nothing in API, all source code are persist in FS.
   */
  scaffoldSourceCode: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * Called when creating a new project or adding a new resource.
   * Returns resource templates (e.g. Bicep templates/plain JSON) for provisioning
   * based on the resource templates returned by resource plugins.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User's answers to questions defined in {@link getQuestionsForLifecycleTask} for {@link Stage.create} along with some system inputs.
   * @param {Json} - model for config.${env}.json, which is created core, solution will fill in some keys in it, such as azure, manifest
   *
   * @return {Json} envConfig
   */
  generateResourceTemplate: (ctx: Context, inputs: Inputs) => Promise<Result<Json, FxError>>;

  /**
   * This method is called by the Toolkit when users run "Provision in the Cloud" command.
   * The implementation of solution is expected to do these operations in order:
   * 1) Call resource plugins' provisionResource.
   * 2) Run Bicep/ARM deployment returned by {@link generateResourceTemplate}.
   * 3) Call resource plugins' configureResource.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {ProvisionInputs} inputs - system inputs
   * @param {DeepReadonly<EnvInfoV2>} envInfo - model for config.${env}.json, in which, user can customize some inputs for provision
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns {EnvProfile} the state (persist by core as `state.${env}.json`) containing provision outputs, which will be used for deploy and publish
   */
  provisionResources: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<FxResult<SolutionProvisionOutput, FxError>>;

  /**
   * Depends on the values returned by {@link provisionResources}.
   * Expected behavior is to deploy code to cloud using credentials provided by {@link AzureAccountProvider}.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs
   * @param {Json} provisionOutputs - provision outputs
   * @param {AzureAccountProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   */
  deploy?: (
    ctx: Context,
    inputs: Inputs,
    provisionOutputs: Json,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * Depends on the output of {@link package}. Uploads Teams package to AppStudio
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User answers to questions defined in {@link getQuestionsForLifecycleTask}
   * @param {DeepReadonly<EnvInfoV2>} envInfo - a readonly view to the current env
   * @param {AppStudioTokenProvider} tokenProvider - Token for AppStudio
   */
  publishApplication: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * provisionLocalResource is a special lifecycle, called when users press F5 in vscode.
   * It works like provision, but only creates necessary cloud resources for local debugging like AAD and AppStudio App.
   * Implementation of this lifecycle is expected to call each resource plugins' provisionLocalResource, and after all of
   * them finishes, call configureLocalResource of each plugin.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User answers to questions defined in {@link getQuestionsForLifecycleTask}
   * @param {Json} localSettings - JSON holding the output values for debugging
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns the output localSettings
   */
  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<FxResult<Json, FxError>>;

  /**
   * get question model for lifecycle {@link Stage} (create), Questions are organized as a tree. Please check {@link QTreeNode}.
   */
  getQuestionsForScaffolding?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * execute user customized task, for example `Add Resource`, `Add Capabilities`, etc
   */
  executeUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: EnvInfoV2,
    tokenProvider: TokenProvider
  ) => Promise<Result<unknown, FxError>>;

  /**
   * for env management
   */
  createEnv?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
  activateEnv?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * For grant and check permission in remote collaboration
   */
  grantPermission?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;
  checkPermission?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;
  listCollaborator?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;

  listAllCollaborators?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;

  //legacy API for compatibility reason
  getQuestions?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  getQuestionsForUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
}
