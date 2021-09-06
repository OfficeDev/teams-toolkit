// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  Result,
  TokenProvider
} from "@microsoft/teamsfx-api";
import {
  Context, ResourcePlugin,
  ResourceTemplate
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { SimpleAuthPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsV2
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  generateResourceTemplateAdapter,
  provisionLocalResourceAdapter
} from "../../utils4v2";

@Service(ResourcePluginsV2.SimpleAuthPlugin)
export class AadPluginV2 implements ResourcePlugin {
  name = "fx-resource-simple-auth";
  displayName = "Simple Auth";
  @Inject(ResourcePlugins.SimpleAuthPlugin)
  plugin!: SimpleAuthPlugin;
  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }

  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Json, FxError>> {
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
  ): Promise<Result<Json, FxError>> {
    return await configureLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
      tokenProvider,
      this.plugin
    );
  }
}
