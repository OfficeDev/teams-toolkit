// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings, FxError,
  Inputs,
  Json,
  Result,
  TokenProvider,
  Void
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs, ProvisionInputs,
  ResourcePlugin,
  ResourceTemplate
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { FrontendPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsV2
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureResourceAdapter,
  deployAdapter,
  generateResourceTemplateAdapter,
  scaffoldSourceCodeAdapter
} from "../../utils4v2";

@Service(ResourcePluginsV2.FrontendPlugin)
export class FrontendPluginV2 implements ResourcePlugin {
  name = "fx-resource-frontend-hosting";
  displayName = "Tab Front-end";
  @Inject(ResourcePlugins.FrontendPlugin)
  plugin!: FrontendPlugin;

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

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
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

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    provisionOutput: Json,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return await deployAdapter(ctx, inputs, provisionOutput, tokenProvider, this.plugin);
  }
}
