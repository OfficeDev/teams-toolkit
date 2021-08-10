// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  BicepTemplate,
  Context,
  DeploymentInputs,
  PluginName,
  ProvisionOutput,
  ResourcePlugin,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import {
  Inputs,
  PluginContext,
  ConfigMap,
  Result,
  FxError,
  Plugin,
  err,
  ok,
  TokenProvider,
  AzureAccountProvider,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { NoProjectOpenedError } from "../../core";
import { ArmResourcePlugin, ScaffoldArmTemplateResult } from "../../common/armInterface";
import { GLOBAL_CONFIG } from "../solution/fx-solution/constants";

export function convert2PluginContext(ctx: Context, inputs: Inputs): PluginContext {
  if (!inputs.projectPath) throw NoProjectOpenedError();
  const pluginContext: PluginContext = {
    root: inputs.projectPath,
    config: new ConfigMap(),
    configOfOtherPlugins: new Map<string, ConfigMap>(),
    projectSettings: ctx.projectSetting,
    answers: inputs,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    cryptoProvider: ctx.cryptoProvider,
    ui: ctx.userInteraction,
  };
  return pluginContext;
}

export class ResourcePluginAdapter implements ResourcePlugin {
  name: string;
  displayName: string;
  plugin: Plugin & ArmResourcePlugin;

  constructor(plugin: Plugin & ArmResourcePlugin) {
    this.plugin = plugin;
    this.name = plugin.name;
    this.displayName = plugin.displayName;
  }

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async scaffoldSourceCode(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    if (!this.plugin.scaffold) return ok({ output: {} });
    if (!inputs.projectPath) {
      return err(NoProjectOpenedError());
    }
    const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
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
    if (!this.plugin.generateArmTemplates) return ok({ kind: "bicep", template: {} });
    const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
    const armRes = await this.plugin.generateArmTemplates(pluginContext);
    if (armRes.isErr()) {
      return err(armRes.error);
    }
    const output: ScaffoldArmTemplateResult = armRes.value as ScaffoldArmTemplateResult;
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
    if (!this.plugin.postProvision) return ok({ output: {}, states: {}, secrets: {} });
    const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
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
    inputs: Readonly<DeploymentInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
    if (!this.plugin.deploy) return ok({ output: {} });
    const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
    pluginContext.azureAccountProvider = tokenProvider;
    const configsOfOtherPlugins = new Map<string, ConfigMap>();
    const solutionConfig = new ConfigMap();
    solutionConfig.set("resourceNameSuffix", inputs.resourceNameSuffix);
    solutionConfig.set("resourceGroupName", inputs.resourceGroupName);
    solutionConfig.set("location", inputs.location);
    solutionConfig.set("remoteTeamsAppId", inputs.remoteTeamsAppId);
    configsOfOtherPlugins.set(GLOBAL_CONFIG, solutionConfig);
    const selfConfigMap = ConfigMap.fromJSON(provisionOutput.output) || new ConfigMap();
    pluginContext.config = selfConfigMap;
    pluginContext.configOfOtherPlugins = configsOfOtherPlugins;
    if (this.plugin.preDeploy) {
      const preRes = await this.plugin.preDeploy(pluginContext);
      if (preRes.isErr()) {
        return err(preRes.error);
      }
    }
    const deployRes = await this.plugin.deploy(pluginContext);
    if (deployRes.isErr()) {
      return err(deployRes.error);
    }
    const deployOutput = selfConfigMap.toJSON();
    return ok({ output: deployOutput });
  }
}
