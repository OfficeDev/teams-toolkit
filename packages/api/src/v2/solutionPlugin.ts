// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow";
import {
  FxError,
  Inputs,
  QTreeNode,
  TokenProvider,
  Func,
  Void,
  AzureAccountProvider,
  AppStudioTokenProvider,
} from "../index";
import { EnvConfig } from "../schemas";
import { Context, EnvProfile, LocalSettings } from "./types";

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
  scaffoldSourceCode?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * Called when creating a new project or adding a new resource.
   * Returns resource templates (e.g. Bicep templates/plain JSON) for provisioning
   * based on the resource templates returned by resource plugins.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User's answers to questions defined in {@link getQuestionsForLifecycleTask}
   * for {@link Stage.create} along with some system inputs.
   * @param {EnvConfig} envConfig - model for config.${env}.json, which is created core, solution will fill in some keys in it, such as azure, manifest
   *
   * @return Void because side effect is expected.
   */
  generateResourceTemplate: (
    ctx: Context,
    inputs: Inputs,
    envConfig: EnvConfig
  ) => Promise<Result<Void, FxError>>;

  /**
   * This method is called by the Toolkit when users run "Provision in the Cloud" command.
   * The implementation of solution is expected to do these operations in order:
   * 1) Call resource plugins' provisionResource.
   * 2) Run Bicep/ARM deployment returned by {@link generateResourceTemplate}.
   * 3) Call resource plugins' configureResource.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs
   * @param {EnvConfig} envConfig - model for config.${env}.json, in which, user can customize some inputs for provision
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns {EnvProfile} the profile (persist by core as `profile.${env}.json`) containing provision outputs, which will be used for deploy and publish
   */
  provisionResources: (
    ctx: Context,
    inputs: Inputs,
    envConfig: EnvConfig,
    tokenProvider: TokenProvider
  ) => Promise<Result<EnvProfile, FxError>>;

  /**
   * Depends on the values returned by {@link provisionResources}.
   * Expected behavior is to deploy code to cloud using credentials provided by {@link AzureAccountProvider}.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs
   * @param {EnvProfile} envProfile - profile containing provision outputs
   * @param {AzureAccountProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns deployment output values for each plugin, which will be persisted by the Toolkit and available to other plugins for other lifecyles.
   */
  deploy?: (
    ctx: Context,
    inputs: Inputs,
    envProfile: EnvProfile,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * Depends on the output of {@link package}. Uploads Teams package to AppStudio
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User answers to questions defined in {@link getQuestionsForLifecycleTask}
   * @param {EnvConfig} envConfig - contains the user customized values for manifest placeholders
   * @param {EnvProfile} envProfile - contains the provision output values for manifest placeholders
   * @param {AppStudioTokenProvider} tokenProvider - Token for AppStudio
   * for {@link Stage.publish} along with some system inputs.
   *
   * @returns Void because side effect is expected.
   */
  publishApplication?: (
    ctx: Context,
    inputs: Inputs,
    envConfig: EnvConfig,
    envProfile: EnvProfile,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * Generates a Teams manifest package for the current project,
   * and stores it on disk.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs.
   * @param {EnvConfig} envConfig - contains the user customized values for manifest placeholders
   * @param {EnvProfile} envProfile - contains the provision output values for manifest placeholders
   * @param {EnvConfig} envConfig - system inputs.
   *
   * @returns Void because side effect is expected.
   */
  package?: (
    ctx: Context,
    envConfig: EnvConfig,
    envProfile: EnvProfile
  ) => Promise<Result<Void, FxError>>;

  /**
   * provisionLocalResource is a special lifecycle, called when users press F5 in vscode.
   * It works like provision, but only creates necessary cloud resources for local debugging like AAD and AppStudio App.
   * Implementation of this lifecycle is expected to call each resource plugins' provisionLocalResource, and after all of
   * them finishes, call configureLocalResource of each plugin.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns the output values, project state, secrect values for each plugin
   */
  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs, 
    tokenProvider: TokenProvider
  ) => Promise<Result<LocalSettings, FxError>>;

  /**
   * get question model for lifecycle {@link Stage} (create), Questions are organized as a tree. Please check {@link QTreeNode}.
   */
  getQuestionsForScaffolding: (inputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
    inputs: Inputs,
    
   * execute user customized task, for example `Add Resource`, `Add Capabilities`, etc
   */
  executeUserTask?: (ctx: Context, inputs: Inputs, func: Func) => Promise<Result<unknown, FxError>>;
}
