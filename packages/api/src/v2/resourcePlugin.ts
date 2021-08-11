// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError, QTreeNode, TokenProvider, Void, Func, Json, Inputs } from "../index";
import { AzureSolutionSettings } from "../types";
import { AppStudioTokenProvider, AzureAccountProvider } from "../utils";
import {
  Context,
  DeploymentInputs,
  LocalSetting,
  LocalSettings,
  PluginName,
  ProvisionInputs,
} from "./types";

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

export type ProvisionOutput = {
  output: Record<string, string>;
  states: Record<string, string>;
  // Encryption and decryption are handled transparantly by the toolkit.
  secrets: Record<string, string>;
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
   * @param {Inputs} inputs - User answers to quesions defined in {@link getQuestionsForScaffolding} along with some system inputs.
   *
   * @returns output values generated during scaffolding, which will be persisted by the Toolkit and made available to other plugins for other lifecyles.
   *          For example, Azure Function plugin outputs "defaultFunctionName" in this lifecycle.
   *          For most plugins, empty output is good enough.
   */
  scaffoldSourceCode?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<{ output: Record<string, string> }, FxError>>;

  /**
   * Called when creating a new project or adding a new resource.
   * Returns resource templates (e.g. Bicep templates/plain JSON) for provisioning.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User's answers to quesions defined in {@link getQuestionsForScaffolding} along with some system inputs.
   *
   * @return {@link ResourceTemplate} for provisioning and deployment.
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
   * @param {Readonly<ProvisionInputs>} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Json} provisionTemplate - provision template
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns the config, project state, secrect values for the current environment. Toolkit will persist them
   *          and pass them to {@link configureResource}.
   */
  provisionResource?: (
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    provisionTemplate: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<ProvisionOutput, FxError>>;

  /**
   * configureResource is guaranteed to run after Bicep/ARM provisioning.
   * Plugins are expected to read the provision output values of other plugins, and return a new copy of its own provision output,
   * possibly with added fields.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Readonly<ProvisionInputs>} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Readonly<ProvisionOutput>} provisionOutput - values generated by {@link provisionResource}
   * @param {Readonly<Record<PluginName, Json>>} provisionOutputOfOtherPlugins - values of other plugins generated by {@link provisionResource}
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns a new copy of provisionOutput possibly with added fields. Toolkit will persist it and pass it to {@link deploy}.
   *
   */
  configureResource?: (
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    provisionOutputOfOtherPlugins: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: TokenProvider
  ) => Promise<Result<ProvisionOutput, FxError>>;

  /**
   * Generates a Teams manifest package for the current project,
   * and stores it on disk.
   *
   * On failure, plugins are responsible for cleaning up.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs.
   *
   * @returns Void because side effect is expected.
   */
  package?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * Depends on the values returned by {@link provisionResource} and {@link configureResource}.
   * Plugins are expected to deploy code to cloud using credentials provided by {@link AzureAccountProvider}.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Readonly<DeploymentInputs>} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Readonly<ProvisionOutput>} provisionTemplate - output generated during provision
   * @param {AzureAccountProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns output values generated by deployment, which will be persisted by the Toolkit and will be available to other plugins for other lifecyles.
   */
  deploy?: (
    ctx: Context,
    inputs: Readonly<DeploymentInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<{ output: Record<string, string> }, FxError>>;

  /**
   * Depends on the output of {@link package}. Uploads Teams package to AppStudio
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {AppStudioTokenProvider} tokenProvider - Token for AppStudio
   * @param {Inputs} inputs - system inputs.
   *
   * @returns Void because side effect is expected.
   */
  publishApplication?: (
    ctx: Context,
    tokenProvider: AppStudioTokenProvider,
    inputs: Inputs
  ) => Promise<Result<Void, FxError>>;

  /**
   * provisionLocalResource is a special lifecycle, called when users press F5 in vscode.
   * It works like provision, but only creates necessary cloud resources for local debugging like AAD and AppStudio App.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns the output values, project state, secret values for the current environment. Toolkit will persist them
   *          and pass them to {@link configureLocalResource}. The output will be persisted but not in the same file as provison's output.
   */
  provisionLocalResource?: (
    ctx: Context,
    tokenProvider: TokenProvider
  ) => Promise<Result<LocalSetting, FxError>>;

  /**
   * configureLocalResource works like {@link configureResource} but only for local debugging resources.
   * Plugins are expected to read the local provision output values of other plugins, and return a new copy of its own local provision output,
   * possibly with added fields.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Readonly<LocalSettings>} localProvisionOutput - values generated by {@link provisionLocalResource}
   * @param {Readonly<Record<PluginName, LocalSettings>>} provisionOutputOfOtherPlugins - values of other plugins generated by {@link provisionLocalResource}
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns a new copy of provisionOutput possibly with added fields. The output will be persisted but not in the same file as provison's output.
   */
  configureLocalResource?: (
    ctx: Context,
    localProvisionOutput: Readonly<LocalSetting>,
    localProvisionOutputOfOtherPlugins: Readonly<LocalSettings>,
    tokenProvider: TokenProvider
  ) => Promise<Result<LocalSettings, FxError>>;

  getQuestionsForScaffolding?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  // Building teams package is now defined as a user task
  executeUserTask?: (ctx: Context, func: Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;
}
