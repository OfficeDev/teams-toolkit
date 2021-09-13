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
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  ProvisionInputs,
  ResourcePlugin,
  ResourceProvisionOutput,
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
    inputs: ProvisionInputs,
    provisionInputConfig: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await provisionResourceAdapter(
      ctx,
      inputs,
      provisionInputConfig,
      tokenProvider,
      this.plugin
    );
  }

  async configureResource(
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    provisionInputConfig: Json,
    provisionOutputs: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await configureResourceAdapter(
      ctx,
      inputs,
      provisionInputConfig,
      provisionOutputs,
      tokenProvider,
      this.plugin
    );
  }

  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
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
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
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
    inputs: Inputs,
    func: Func
  ): Promise<Result<unknown, FxError>> {
    return await executeUserTaskAdapter(ctx, inputs, func, this.plugin);
  }
}
