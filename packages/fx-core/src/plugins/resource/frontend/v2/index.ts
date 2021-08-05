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
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { InvalidInputError } from "../../../../core";
import { Container } from "typedi";

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
    const pluginContext: PluginContext = {
      root: inputs.projectPath,
      config: new ConfigMap(),
      configOfOtherPlugins: new Map<string, ReadonlyPluginConfig>(),
    };
    await this.plugin.scaffold(pluginContext);
    const output = pluginContext.config.toJSON();
    return ok({ output: output });
  }
}

const pluginv2 = Container.get<FrontendPluginV2>(ResourcePluginsV2.FrontendPlugin);
console.log(pluginv2.plugin.name);
