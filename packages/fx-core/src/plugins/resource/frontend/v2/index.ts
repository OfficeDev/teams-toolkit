// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings, FxError, Inputs, Result
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs, ProvisionOutput,
  ResourcePlugin,
  ResourceTemplate
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { FrontendPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsV2
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { deployAdapter, generateResourceTemplateAdapter, scaffoldSourceCodeAdapter } from "../../utils4v2";

@Service(ResourcePluginsV2.FrontendPlugin)
export class FrontendPluginV2 implements ResourcePlugin {
  name = "fx-resource-frontend-hosting";
  displayName = "Tab Front-end";
  @Inject(ResourcePlugins.FrontendPlugin)
  plugin!: FrontendPlugin;

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

  async deploy(
    ctx: Context,
    inputs: Readonly<DeploymentInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    tokenProvider: AzureAccountProvider,
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    return await deployAdapter(ctx, inputs, provisionOutput, tokenProvider, this.plugin);
  }
}
