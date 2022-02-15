// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  ProjectSettings,
  Result,
  TokenProvider,
  v2,
  Void,
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
import {
  generateResourceTemplateAdapter,
  provisionResourceAdapter,
  updateResourceTemplateAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.IdentityPlugin)
export class IdentityPluginV2 implements ResourcePlugin {
  name = "fx-resource-identity";
  displayName = "Microsoft Identity";
  @Inject(ResourcePlugins.IdentityPlugin)
  plugin!: IdentityPlugin;

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return this.plugin.activate(solutionSettings);
  }
  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return updateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
}
