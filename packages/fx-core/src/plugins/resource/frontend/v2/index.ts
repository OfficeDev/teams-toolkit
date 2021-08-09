// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inject, Service } from "typedi";
import { FrontendPlugin } from "../..";
import {
  FxError,
  AzureSolutionSettings,
  Inputs,
  Result,
  PluginContext,
  ConfigMap,
  ReadonlyPluginConfig,
  err,
  ok,
  AzureAccountProvider,
} from "@microsoft/teamsfx-api";
import { Context, ProvisionOutput, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { InvalidInputError } from "../../../../core";
import { Container } from "typedi";
import { V2Context2PluginContext } from "../../..";
import { SolutionConfig } from "../../apim/config";

@Service(ResourcePluginsV2.FrontendPlugin)
export class FrontendPluginV2 implements ResourcePlugin {
  @Inject(ResourcePlugins.FrontendPlugin)
  plugin!: FrontendPlugin;

  name = "fx-resource-frontend-hosting";
  displayName = "Tab Front-end";

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async scaffoldSourceCode(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    if (!inputs.projectPath) {
      return err(InvalidInputError("projectPath is empty", inputs));
    }
    const pluginContext: PluginContext = V2Context2PluginContext(ctx, inputs);
    await this.plugin.scaffold(pluginContext);
    const output = pluginContext.config.toJSON();
    return ok({ output: output });
  }

  async deploy(
    ctx: Context,
    inputs: Inputs,
    deployInput: Readonly<ProvisionOutput>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    const pluginContext: PluginContext = V2Context2PluginContext(ctx, inputs);
    const soutionConfig = new ConfigMap();
    const configsOfOtherPlugins = new Map<string, ConfigMap>();
    configsOfOtherPlugins.set("solution", soutionConfig);
    pluginContext.configOfOtherPlugins = configsOfOtherPlugins;
    soutionConfig.set();
    await this.plugin.preDeploy();
    await this.plugin.deploy();
    return ok({ output: {} });
  }
}

const pluginv2 = Container.get<FrontendPluginV2>(ResourcePluginsV2.FrontendPlugin);
console.log(pluginv2.plugin.name);
