// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  FxError,
  Inputs,
  QTreeNode,
  Result,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs,
  EnvProfile,
  ResourcePlugin,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { SpfxPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  deployAdapter,
  getQuestionsForScaffoldingAdapter,
  scaffoldSourceCodeAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.SpfxPlugin)
export class SpfxPluginV2 implements ResourcePlugin {
  name = "fx-resource-spfx";
  displayName = "SharePoint Framework (SPFx)";
  @Inject(ResourcePlugins.SpfxPlugin)
  plugin!: SpfxPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async getQuestionsForScaffolding(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsForScaffoldingAdapter(ctx, inputs, this.plugin);
  }

  async scaffoldSourceCode(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envProfile: EnvProfile,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return await deployAdapter(ctx, inputs, envProfile, tokenProvider, this.plugin);
  }
}
