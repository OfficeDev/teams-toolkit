// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { SolutionProvisionOutput } from ".";
import { FxError, QTreeNode, TokenProvider, Void, Func, Json, Inputs, EnvInfo } from "../index";
import { AzureSolutionSettings } from "../types";
import { AppStudioTokenProvider, AzureAccountProvider } from "../utils";
import { Context, DeploymentInputs, FxResult, ProvisionInputs } from "./types";

export type ResourceTemplate = BicepTemplate | JsonTemplate;

export type JsonTemplate = {
  kind: "json";
  template: Json;
};

export type BicepTemplate = {
  kind: "bicep";
  // The format of template can be found at https://microsoftapc.sharepoint.com/:w:/t/DevDivTeamsDevXProductTeam/EZCuSzABypNBr30K-_wvRVEBksF1-ftqVv8l-34art1FFw?e=nEYfZK
  template: Record<string, unknown>;
};

export type ResourceProvisionOutput = {
  output: Json;
  // Encryption and decryption are handled transparently by the toolkit.
  secrets: Json;
};

/**
 * Interface for ResourcePlugins. a ResourcePlugin can hook into Toolkit's
 * lifecycles by implementing the corresponding API.
 * Implementation of all lifecycles is expected to be idempotent. The return values
 * and observable side effects of each lifecycle are expected to be the same with the same input.
 * All lifecycles follow the same pattern of returning a Promise<Result<T, FxError>>.
 *
 * Please return {@link UserError} or {@link SystemError} when error happens
 * instead of throwing.
 */
export interface ResourcePlugin {
  // Name used by the Toolkit to uniquely identify this plugin.
  name: string;

  // Plugin name that will be shown to end users.
  displayName: string;

  /**
   * resource plugin decide whether it need to be activated
   * @param solutionSettings solution settings
   */
  activate(solutionSettings: AzureSolutionSettings): boolean;

  /**
   * Called by Toolkit when creating a new project or adding a new resource.
   * Scaffolds source code on disk, relative to context.projectPath.
   *
   * @example
   * ```
   * scaffoldSourceCode(ctx: Context, inputs: Inputs) {
   *   const fs = require("fs-extra");
   *   let content = "let x = 1;"
   *   let path = path.join(ctx.projectPath, "myFolder");
   *   let sourcePath = "somePathhere";
   *   let result = await fs.copy(sourcePath, content);
   *   // no output values
   *   return { "output": {} };
   * }
   * ```
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User answers to questions defined in {@link getQuestionsForScaffolding} along with some system inputs.
   *
   * @returns output values generated during scaffolding, which will be persisted by the Toolkit and made available to other plugins for other lifecyles.
   *          For example, Azure Function plugin outputs "defaultFunctionName" in this lifecycle.
   *          For most plugins, empty output is good enough.
   */
  scaffoldSourceCode?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * Called when creating a new project or adding a new resource.
   * Returns resource templates (e.g. Bicep templates/plain JSON) for provisioning.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User's answers to questions defined in {@link getQuestionsForScaffolding} along with some system inputs.
   *
   * @return {@link ResourceTemplate} return ARM template for solution to combine.
   */
  generateResourceTemplate?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<ResourceTemplate, FxError>>;

  /**
   * This method is useful for resources that can't be provisioned using Bicep/ARM like AAD, AppStudio.
   * Plugins are expected to provision using Azure SDK.
   *
   * provisionResource is guaranteed to run before Bicep provision.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {ProvisionInputs} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Omit<EnvInfo, "profile">} envInfo - model for config.${env}.json, in which, user can customize some inputs for provision
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns {ResourceProvisionOutput} resource provision output
   */
  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: EnvInfo,
    tokenProvider: TokenProvider
  ) => Promise<FxResult<ResourceProvisionOutput, FxError>>;

  /**
   * configureResource is guarantee to run after Bicep/ARM provisioning.
   * Plugins are expected to read the provision output values of other plugins, and return a new copy of its own provision output,
   * possibly with added fields.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {ProvisionInputs} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Json} provisionInputConfig - model for config.${env}.json, in which, user can customize some inputs for provision
   * @param {Readonly<SolutionProvisionOutput>} provisionOutputs - the profile (persist by core as `profile.${env}.json`) containing provision outputs
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns {ResourceProvisionOutput} resource provision output
   */
  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: Readonly<
      Omit<EnvInfo, "profile"> & { profile: Record<string, ResourceProvisionOutput> }
    >,
    tokenProvider: TokenProvider
  ) => Promise<FxResult<ResourceProvisionOutput, FxError>>;

  /**
   * Depends on the values returned by {@link provisionResource} and {@link configureResource}.
   * Plugins are expected to deploy code to cloud using credentials provided by {@link AzureAccountProvider}.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {DeploymentInputs} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Json} provisionOutputs - profile containing provision outputs
   * @param {AzureAccountProvider} tokenProvider - Tokens for Azure and AppStudio
   */
  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    provisionOutputs: Json,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * Depends on the output of {@link package}. Uploads Teams package to AppStudio
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs.
   * @param {Json} provisionInputConfig - contains the user customized values for manifest placeholders
   * @param {Json} provisionOutputs - contains the provision output values for manifest placeholders
   * @param {AppStudioTokenProvider} tokenProvider - Token for AppStudio
   *
   * @returns Void because side effect is expected.
   */
  publishApplication?: (
    ctx: Context,
    inputs: Inputs,
    provisionInputConfig: Json,
    provisionOutputs: Json,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * provisionLocalResource is a special lifecycle, called when users press F5 in vscode.
   * It works like provision, but only creates necessary cloud resources for local debugging like AAD and AppStudio App.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs.
   * @param {Json} localSettings - local debug settings generated by {@link provisionLocalResource}
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   */
  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * configureLocalResource works like {@link configureResource} but only for local debugging resources.
   * Plugins are expected to read the local provision output values of other plugins, and return a new copy of its own local provision output,
   * possibly with added fields.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Json} localSettings - local debug settings generated by {@link scaffoldSourceCode}
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   */
  configureLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  getQuestionsForScaffolding?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  executeUserTask?: (ctx: Context, inputs: Inputs, func: Func) => Promise<Result<unknown, FxError>>;
}
