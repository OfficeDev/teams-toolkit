// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  Result,
  TokenProvider,
  v2,
} from "@microsoft/teamsfx-api";
import {
  Context,
  ProvisionInputs,
  ResourcePlugin,
  ResourceProvisionOutput,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { IdentityPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { generateResourceTemplateAdapter, provisionResourceAdapter } from "../../utils4v2";

@Service(ResourcePluginsV2.IdentityPlugin)
export class IdentityPluginV2 implements ResourcePlugin {
  name = "fx-resource-identity";
  displayName = "Microsoft Identity";
  @Inject(ResourcePlugins.IdentityPlugin)
  plugin!: IdentityPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }
  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: Readonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
}
