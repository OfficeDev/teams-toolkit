// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  ProjectSettings,
  QTreeNode,
  Result,
  Stage,
  TokenProvider,
  traverse,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeepReadonly,
  DeploymentInputs,
  ProvisionInputs,
  ResourcePlugin,
  ResourceProvisionOutput,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { ApimPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureResourceAdapter,
  convert2PluginContext,
  deployAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  getQuestionsAdapter,
  getQuestionsForScaffoldingAdapter,
  getQuestionsForUserTaskAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
  updateResourceTemplateAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.ApimPlugin)
export class ApimPluginV2 implements ResourcePlugin {
  name = "fx-resource-apim";
  displayName = "API Management";
  @Inject(ResourcePlugins.ApimPlugin)
  plugin!: ApimPlugin;

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return this.plugin.activate(solutionSettings);
  }

  async getQuestions(
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async getQuestionsForScaffolding(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsForScaffoldingAdapter(ctx, inputs, this.plugin);
  }

  async getQuestionsForUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsForUserTaskAdapter(
      ctx,
      inputs,
      func,
      envInfo,
      tokenProvider,
      this.plugin
    );
  }

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: Readonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: Readonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await configureResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    // const questionRes = await this.plugin.getQuestions(
    //   Stage.deploy,
    //   convert2PluginContext(ctx, inputs)
    // );
    // if (questionRes.isOk()) {
    //   const node = questionRes.value;
    //   if (node) {
    //     const res = await traverse(node, inputs, ctx.userInteraction);
    //     if (res.isErr()) {
    //       return err(res.error);
    //     }
    //   }
    // }
    return await deployAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<unknown, FxError>> {
    return await executeUserTaskAdapter(
      ctx,
      inputs,
      func,
      localSettings,
      envInfo,
      tokenProvider,
      this.plugin
    );
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return await updateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
}
