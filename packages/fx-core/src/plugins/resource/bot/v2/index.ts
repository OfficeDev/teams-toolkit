// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  QTreeNode,
  Result,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs,
  LocalSettings,
  PluginName,
  ProvisionInputs,
  ProvisionOutput,
  ResourcePlugin,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { TeamsBot } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  configureResourceAdapter,
  deployAdapter,
  generateResourceTemplateAdapter,
  getQuestionsForScaffoldingAdapter,
  provisionLocalResourceAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.BotPlugin)
export class BotPluginV2 implements ResourcePlugin {
  name = "fx-resource-bot";
  displayName = "Bot";
  @Inject(ResourcePlugins.BotPlugin)
  plugin!: TeamsBot;

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
  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: LocalSettings,
    tokenProvider: TokenProvider
  ): Promise<Result<LocalSettings, FxError>> {
    return await provisionLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
      tokenProvider,
      this.plugin
    );
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: LocalSettings,
    tokenProvider: TokenProvider
  ): Promise<Result<LocalSettings, FxError>> {
    return await configureLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
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
}
