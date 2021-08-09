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
  err,
  ok,
  AzureAccountProvider,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  BicepTemplate,
  Context,
  ProvisionOutput,
  ResourcePlugin,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { InvalidInputError } from "../../../../core";
import { V2Context2PluginContext } from "../../..";
import { PluginName } from "../../../../../../api/build/v2";
import { ScaffoldArmTemplateResult } from "../../../../common/armInterface";

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
    const scaffoldRes = await this.plugin.scaffold(pluginContext);
    if (scaffoldRes.isErr()) {
      return err(scaffoldRes.error);
    }
    const output = pluginContext.config.toJSON();
    return ok({ output: output });
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const pluginContext: PluginContext = V2Context2PluginContext(ctx, inputs);
    const armRes = await this.plugin.generateArmTemplates(pluginContext);
    if (armRes.isErr()) {
      return err(armRes.error);
    }
    const output: ScaffoldArmTemplateResult = armRes.value as ScaffoldArmTemplateResult;
    //TODO
    const bicepTemplate: BicepTemplate = { kind: "bicep", template: output };
    return ok(bicepTemplate);
  }

  async configureResource(
    ctx: Context,
    inputs: Inputs,
    provisionOutput: Readonly<ProvisionOutput>,
    provisionOutputOfOtherPlugins: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: TokenProvider
  ): Promise<Result<ProvisionOutput, FxError>> {
    const pluginContext: PluginContext = V2Context2PluginContext(ctx, inputs);
    pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
    const configsOfOtherPlugins = new Map<string, ConfigMap>();
    for (const key in provisionOutputOfOtherPlugins) {
      const output = provisionOutputOfOtherPlugins[key].output;
      const configMap = ConfigMap.fromJSON(output);
      if (configMap) configsOfOtherPlugins.set(key, configMap);
    }
    const selfConfigMap = ConfigMap.fromJSON(provisionOutput.output) || new ConfigMap();
    pluginContext.config = selfConfigMap;
    pluginContext.configOfOtherPlugins = configsOfOtherPlugins;
    const postRes = await this.plugin.postProvision(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
    const output: ProvisionOutput = {
      output: selfConfigMap.toJSON(),
      states: {},
      secrets: {},
    };
    return ok(output);
  }

  async deploy(
    ctx: Context,
    inputs: Inputs,
    provisionOutput: Readonly<ProvisionOutput>,
    provisionOutputOfOtherPlugins: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    const pluginContext: PluginContext = V2Context2PluginContext(ctx, inputs);
    pluginContext.azureAccountProvider = tokenProvider;
    const configsOfOtherPlugins = new Map<string, ConfigMap>();
    for (const key in provisionOutputOfOtherPlugins) {
      const output = provisionOutputOfOtherPlugins[key].output;
      const configMap = ConfigMap.fromJSON(output);
      if (configMap) configsOfOtherPlugins.set(key, configMap);
    }
    const selfConfigMap = ConfigMap.fromJSON(provisionOutput.output) || new ConfigMap();
    pluginContext.config = selfConfigMap;
    pluginContext.configOfOtherPlugins = configsOfOtherPlugins;
    const preRes = await this.plugin.preDeploy(pluginContext);
    if (preRes.isErr()) {
      return err(preRes.error);
    }
    const deployRes = await this.plugin.deploy(pluginContext);
    if (deployRes.isErr()) {
      return err(deployRes.error);
    }
    const deployOutput = selfConfigMap.toJSON();
    return ok({ output: deployOutput });
  }
}
