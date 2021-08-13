// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  AzureAccountProvider,
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  Json,
  Result,
  TokenProvider,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs,
  PluginName,
  ProvisionInputs,
  ProvisionOutput,
  ResourcePlugin,
  ResourceTemplate,
  LocalSettings,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { AppStudioPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  configureResourceAdapter,
  deployAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.AppStudioPlugin)
export class FrontendPluginV2 implements ResourcePlugin {
  name = "fx-resource-appstudio";
  displayName = "App Studio";
  @Inject(ResourcePlugins.AppStudioPlugin)
  plugin!: AppStudioPlugin;

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

  async executeUserTask(
    ctx: Context,
    func: Func,
    inputs: Inputs
  ): Promise<Result<unknown, FxError>> {
    return await executeUserTaskAdapter(ctx, func, inputs, this.plugin);
  }

  async publishApplication(
    ctx: Context,
    inputs: Inputs,
    provisionOutputs: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: AppStudioTokenProvider
  ): Promise<Result<Void, FxError>> {
    throw new Error();
  }
}
