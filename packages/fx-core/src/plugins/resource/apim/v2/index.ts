// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  EnvConfig,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  QTreeNode,
  Result,
  Stage,
  TokenProvider,
  traverse,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs,
  EnvProfile,
  ProvisionInputs,
  ResourcePlugin,
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
  getQuestionsForScaffoldingAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.ApimPlugin)
export class ApimPluginV2 implements ResourcePlugin {
  name = "fx-resource-apim";
  displayName = "API Management";
  @Inject(ResourcePlugins.ApimPlugin)
  plugin!: ApimPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }
  async getQuestionsForScaffolding(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsForScaffoldingAdapter(ctx, inputs, this.plugin);
  }
  async scaffoldSourceCode(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envConfig: EnvConfig,
    tokenProvider: TokenProvider
  ): Promise<Result<Json, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envConfig, tokenProvider, this.plugin);
  }

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envConfig: EnvConfig,
    envProfile: EnvProfile,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await configureResourceAdapter(
      ctx,
      inputs,
      envConfig,
      envProfile,
      tokenProvider,
      this.plugin
    );
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envProfile: EnvProfile,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    const questionRes = await this.plugin.getQuestions(
      Stage.deploy,
      convert2PluginContext(ctx, inputs)
    );
    if (questionRes.isOk()) {
      const node = questionRes.value;
      if (node) {
        const res = await traverse(node, inputs, ctx.userInteraction);
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }
    return await deployAdapter(ctx, inputs, envProfile, tokenProvider, this.plugin);
  }

  //addResource
  //TODO apim plugin implement executeUserTask() for addResource (preScaffold + scaffold)
  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func
  ): Promise<Result<unknown, FxError>> {
    const questionRes = await this.plugin.getQuestionsForUserTask(
      func,
      convert2PluginContext(ctx, inputs)
    );
    if (questionRes.isOk()) {
      const node = questionRes.value;
      if (node) {
        const res = await traverse(node, inputs, ctx.userInteraction);
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }
    return await executeUserTaskAdapter(ctx, inputs, func, this.plugin);
  }
}
