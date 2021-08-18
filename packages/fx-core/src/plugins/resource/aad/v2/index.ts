// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  Json,
  Result,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  Context,
  LocalSettings,
  PluginName,
  ProvisionInputs,
  ProvisionOutput,
  ResourcePlugin,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { AadAppForTeamsPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  configureResourceAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  provisionLocalResourceAdapter,
  provisionResourceAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.AadPlugin)
export class AadPluginV2 implements ResourcePlugin {
  name = "fx-resource-aad-app-for-teams";
  displayName = "AAD";
  @Inject(ResourcePlugins.AadPlugin)
  plugin!: AadAppForTeamsPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
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

  async executeUserTask(
    ctx: Context,
    func: Func,
    inputs: Inputs
  ): Promise<Result<unknown, FxError>> {
    return await executeUserTaskAdapter(ctx, func, inputs, this.plugin);
  }
}
