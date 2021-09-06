// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings, FxError,
  Json,
  Result,
  TokenProvider
} from "@microsoft/teamsfx-api";
import { Context, ProvisionInputs, ResourcePlugin, ResourceProvisionOutput } from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { IdentityPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { provisionResourceAdapter } from "../../utils4v2";

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
    provisionInputConfig: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, provisionInputConfig, tokenProvider, this.plugin);
  }
}
