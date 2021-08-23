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
  Result,
  TokenProvider,
  traverse,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs,
  PluginName,
  ProvisionInputs,
  ProvisionOutput,
  ResourcePlugin,
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
  convert2PluginContext,
  deployAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
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

  async scaffoldSourceCode(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }

  async provisionResource(
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    provisionTemplate: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<ProvisionOutput, FxError>> {
    return await provisionResourceAdapter(
      ctx,
      inputs,
      provisionTemplate,
      tokenProvider,
      this.plugin
    );
  }

  async configureResource(
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    provisionOutputOfOtherPlugins: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: TokenProvider
  ): Promise<Result<ProvisionOutput, FxError>> {
    return await configureResourceAdapter(
      ctx,
      inputs,
      provisionOutput,
      provisionOutputOfOtherPlugins,
      tokenProvider,
      this.plugin
    );
  }

  async deploy(
    ctx: Context,
    inputs: Readonly<DeploymentInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    return await deployAdapter(ctx, inputs, provisionOutput, tokenProvider, this.plugin);
  }

  async executeUserTask(
    ctx: Context,
    func: Func,
    inputs: Inputs
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
    return await executeUserTaskAdapter(ctx, func, inputs, this.plugin);
  }
}
