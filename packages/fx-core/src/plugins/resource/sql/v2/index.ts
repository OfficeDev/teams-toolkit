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
} from "@microsoft/teamsfx-api";
import {
  Context,
  PluginName,
  ProvisionInputs,
  ProvisionOutput,
  ResourcePlugin,
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
    inputs: Readonly<ProvisionInputs>,
    provisionTemplate: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<ProvisionOutput, FxError>> {
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
      provisionTemplate,
      tokenProvider,
      this.plugin
    );
  }

  async configureResource(
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    provisionOutputOfOtherPlugins: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: TokenProvider
  ): Promise<Result<ProvisionOutput, FxError>> {
    return await configureResourceAdapter(
      ctx,
      inputs,
      provisionOutput,
      provisionOutputOfOtherPlugins,
      tokenProvider,
      this.plugin
    );
  }
}
