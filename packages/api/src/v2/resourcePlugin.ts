// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { DeepReadonly, InputsWithProjectPath } from ".";
import { FxError, QTreeNode, TokenProvider, Void, Func, Json, Inputs, EnvInfo } from "../index";
import { AzureSolutionSettings } from "../types";
import { AppStudioTokenProvider, AzureAccountProvider } from "../utils";
import { Context, DeploymentInputs, EnvInfoV2, FxResult, ProvisionInputs } from "./types";

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
 *
 * All lifecycles follow the same pattern of returning a Promise<Result<T, FxError>>.
 * Please return {@link UserError} or {@link SystemError} when error happens
 * instead of throwing.
 */
export interface ResourcePlugin {
  // Name used by the Toolkit to uniquely identify this plugin.
  name: string;

  // Plugin name that will be shown to end users.
  displayName: string;

  /**
   * A resource plugin can decide whether it needs to be activated when the Toolkit initializes
   * based on solution settings.
   *
   * @param solutionSettings solution settings
   *
   * @returns whether to be activated
   */
  activate(solutionSettings: AzureSolutionSettings): boolean;

  /**
   * Called by Toolkit when creating a new project or adding a new resource.
   * A resource plugin is expected to scaffold source code or files on disk, relative to context.projectPath.
   *
   * @example
   * ```
   * scaffoldSourceCode(ctx: Context, inputs: Inputs) {
   *   const fs = require("fs-extra");
   *   let content = "let x = 1;"
   *   let path = path.join(ctx.projectPath, "myFolder");
   *   let sourcePath = "somePathhere";
   *   let result = await fs.copy(sourcePath, content);
   *   return ok(Void);
   * }
   * ```
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - User answers to questions defined in {@link getQuestionsForScaffolding} along with some system inputs.
   *
   * @returns Void because side effect is expected.
   */
  scaffoldSourceCode?: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * This method is called when creating a new project or adding a new resource.
   * A resource plugin is expected to return a resource template(e.g. Bicep templates/plain JSON) which will be persisted
   * by the Toolkit and will be used to provision resource when Provision command is called.
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
   * provisionResource() runs before ARM/Bicep provision when Provision command is called.
   * There are two reasons why a resource needs to implement this method:
   * 1) to generate input for ARM/Bicep provision to consume.
   * 2) the resource can't be provisioned using resource templates like ARM/Bicep.
   * Two typical resources that need to implement this method are AAD(Azure Active Directory)
   * and AppSudio, which statisfy both above criteria.
   *
   * A plugin can get access tokens to cloud service using TokenProvider.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {ProvisionInputs} inputs - inputs injected by Toolkit runtime and solution.
   * @param {DeepReadonly<EnvInfoV2>} envInfo - a readonly view of environment info modeled after (config|state).${env}.json
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns {ResourceProvisionOutput} resource provision output which will be persisted by the toolkit into envInfo's state.
   */
  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<ResourceProvisionOutput, FxError>>;

  /**
   * configureResource() is guaranteed to run after Bicep/ARM provision.
   * Plugins are expected to read the provision output of other plugins via envInfo's state,
   * and return a new copy of its own provision output possibly with added and modified fields.
   *
   * Plugins can also sync their settings to the clould using access tokens provided by TokenProvider
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {ProvisionInputs} inputs - inputs injected by Toolkit runtime and solution.
   * @param {DeepReadonly<EnvInfoV2>} envInfo - a readonly view of environment info modeled after (config|state).${env}.json
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns {ResourceProvisionOutput} resource provision output which will be persisted by the toolkit into envInfo's state.
   */
  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider
  ) => Promise<Result<ResourceProvisionOutput, FxError>>;

  /**
   * Depends on the provision output values returned by {@link provisionResource}, ARM/Bicep provision
   * and {@link configureResource}.
   * Plugins are expected to deploy code to cloud using access tokens provided by {@link AzureAccountProvider}.
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {DeploymentInputs} inputs - inputs injected by Toolkit runtime and solution.
   * @param {Json} provisionOutputs - state containing provision outputs modeled after state.${env}.json
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
   * @param {DeepReadonly<EnvInfoV2>} envInfo - a readonly view of environment info modeled after (config|state).${env}.json
   * @param {AppStudioTokenProvider} tokenProvider - Token for AppStudio
   *
   * @returns Void because side effect is expected.
   */
  publishApplication?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV2>,
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
   * @returns Void because side effect is expected.
   */
  provisionLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * configureLocalResource works like {@link configureResource} but only for local debugging resources.
   * Plugins are expected to read the local provision output values of other plugins, and modify in-place
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Json} localSettings - local debug settings generated by {@link scaffoldSourceCode}
   * @param {TokenProvider} tokenProvider - Tokens for Azure and AppStudio
   *
   * @returns Void because side effect is expected.
   */
  configureLocalResource?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  /**
   * Plugins that need to collect user input are expected to implement this method.
   * Questions are organized as a tree. Please see {@link QTreeNode}.
   *
   * getQuestionsForScaffolding() is guaranteed to be called before scaffoldSourceCode().
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {Inputs} inputs - system inputs.
   *
   * @returns question tree.
   */
  getQuestionsForScaffolding?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  executeUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: EnvInfoV2,
    tokenProvider: TokenProvider
  ) => Promise<Result<unknown, FxError>>;

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

  /**
   * For grant and check permission in remote collaboration
   */
  grantPermission?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider,
    userInfo: Json
  ) => Promise<Result<Json, FxError>>;

  checkPermission?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider,
    userInfo: Json
  ) => Promise<Result<Json, FxError>>;

  listCollaborator?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV2>,
    tokenProvider: TokenProvider,
    userInfo: Json
  ) => Promise<Result<Json, FxError>>;
}
