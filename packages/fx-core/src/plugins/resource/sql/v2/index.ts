// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  err,
  FxError,
  Json,
  PluginContext,
  Result,
  Stage,
  TokenProvider,
  traverse,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  ProvisionInputs,
  ResourcePlugin,
  ResourceProvisionOutput,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { SqlPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureResourceAdapter,
  convert2PluginContext,
  provisionResourceAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.SqlPlugin)
export class SqlPluginV2 implements ResourcePlugin {
  name = "fx-resource-azure-sql";
  displayName = "Azure SQL Database";
  @Inject(ResourcePlugins.SqlPlugin)
  plugin!: SqlPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    provisionInputConfig: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    // run question model for publish
    const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
    const getQuestionRes = await this.plugin.getQuestions(Stage.provision, pluginContext);
    if (getQuestionRes.isOk()) {
      const node = getQuestionRes.value;
      if (node) {
        const res = await traverse(node, inputs, ctx.userInteraction);
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }

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
}
