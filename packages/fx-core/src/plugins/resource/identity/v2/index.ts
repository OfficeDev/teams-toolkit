// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  EnvConfig,
  FxError,
  Json,
  Result,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import { Context, ProvisionInputs, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { IdentityPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
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
    inputs: Readonly<ProvisionInputs>,
    envConfig: EnvConfig,
    tokenProvider: TokenProvider
  ): Promise<Result<Json, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envConfig, tokenProvider, this.plugin);
  }
}
