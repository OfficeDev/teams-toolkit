// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  BicepTemplate,
  Context,
  DeploymentInputs,
  LocalSetting,
  LocalSettings,
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
  Stage,
} from "@microsoft/teamsfx-api";
import { NoProjectOpenedError, PluginHasNoTaskImpl, TaskNotSupportError } from "../../core";
import { ArmResourcePlugin, ScaffoldArmTemplateResult } from "../../common/armInterface";
import { GLOBAL_CONFIG } from "../solution/fx-solution/constants";
import { NodeNotSupportedError } from "./function/utils/depsChecker/errors";

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
 

export async function scaffoldSourceCodeAdapter(
    ctx: Context,
    inputs: Inputs,
    plugin: Plugin & ArmResourcePlugin
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
  if (!plugin.scaffold) return err(PluginHasNoTaskImpl(plugin.displayName, "scaffold"));
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  const scaffoldRes = await plugin.scaffold(pluginContext);
  if (scaffoldRes.isErr()) {
    return err(scaffoldRes.error);
  }
  const output = pluginContext.config.toJSON();
  return ok({ output: output });
}

export async function generateResourceTemplateAdapter(
    ctx: Context,
    inputs: Inputs,
    plugin: Plugin & ArmResourcePlugin
  ): Promise<Result<ResourceTemplate, FxError>> {
  if (!plugin.generateArmTemplates) return err(PluginHasNoTaskImpl(plugin.displayName, "generateArmTemplates"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  const armRes = await plugin.generateArmTemplates(pluginContext);
  if (armRes.isErr()) {
    return err(armRes.error);
  }
  const output: ScaffoldArmTemplateResult = armRes.value as ScaffoldArmTemplateResult;
  const bicepTemplate: BicepTemplate = { kind: "bicep", template: output };
  return ok(bicepTemplate);
}

export async function configureResourceAdapter(
    ctx: Context,
    inputs: Inputs,
    provisionOutput: Readonly<ProvisionOutput>,
    provisionOutputOfOtherPlugins: Readonly<Record<PluginName, ProvisionOutput>>,
    tokenProvider: TokenProvider,
    plugin: Plugin & ArmResourcePlugin
  ): Promise<Result<ProvisionOutput, FxError>> {
  if (!plugin.postProvision) return err(PluginHasNoTaskImpl(plugin.displayName, "postProvision"));
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
  const postRes = await plugin.postProvision(pluginContext);
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

export async function deployAdapter(
    ctx: Context,
    inputs: Readonly<DeploymentInputs>,
    provisionOutput: Readonly<ProvisionOutput>,
    tokenProvider: AzureAccountProvider,
    plugin: Plugin & ArmResourcePlugin
  ): Promise<Result<{ output: Record<string, string> }, FxError>> {
  if (!plugin.deploy) return err(PluginHasNoTaskImpl(plugin.displayName, "deploy"));
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
  if (plugin.preDeploy) {
    const preRes = await plugin.preDeploy(pluginContext);
    if (preRes.isErr()) {
      return err(preRes.error);
    }
  }
  const deployRes = await plugin.deploy(pluginContext);
  if (deployRes.isErr()) {
    return err(deployRes.error);
  }
  const deployOutput = selfConfigMap.toJSON();
  return ok({ output: deployOutput });
}

export async function provisionLocalResourceAdapter( ctx: Context, tokenProvider: TokenProvider, plugin: Plugin & ArmResourcePlugin) : Promise<Result<LocalSetting, FxError>>{
  if (!plugin.localDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "localDebug"));
  //TODO
  throw new Error();
}

export async function configureLocalResourceAdapter(
    ctx: Context,
    localProvisionOutput: Readonly<LocalSetting>,
    localProvisionOutputOfOtherPlugins: Readonly<LocalSettings>,
    tokenProvider: TokenProvider,
    plugin: Plugin & ArmResourcePlugin
  ) : Promise<Result<LocalSettings, FxError>>{
    if (!plugin.postLocalDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "postLocalDebug"));
   //TODO
  throw new Error();
}
