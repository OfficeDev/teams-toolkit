// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  Json,
  QTreeNode,
  Result,
  TokenProvider,
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
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { FunctionPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureResourceAdapter,
  deployAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  getQuestionsForUserTaskAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
  updateResourceTemplateAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.FunctionPlugin)
export class FunctionPluginV2 implements ResourcePlugin {
  name = "fx-resource-function";
  displayName = "Azure Function";
  @Inject(ResourcePlugins.FunctionPlugin)
  plugin!: FunctionPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    return await updateResourceTemplateAdapter(ctx, inputs, this.plugin);
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
    provisionOutput: Json,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return await deployAdapter(ctx, inputs, provisionOutput, tokenProvider, this.plugin);
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
}
