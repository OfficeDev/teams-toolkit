// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureAccountProvider,
  ConfigMap,
  EnvConfig,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  ok,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
  TokenProvider,
  Void,
} from "@microsoft/teamsfx-api";
import {
  BicepTemplate,
  Context,
  DeploymentInputs,
  ProvisionInputs,
  ResourceProvisionOutput,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { CryptoDataMatchers } from "../../common";
import { ArmResourcePlugin, ScaffoldArmTemplateResult } from "../../common/armInterface";
import { newEnvInfo, NoProjectOpenedError, PluginHasNoTaskImpl } from "../../core";
import { GLOBAL_CONFIG, ARM_TEMPLATE_OUTPUT } from "../solution/fx-solution/constants";

export function convert2PluginContext(ctx: Context, inputs: Inputs): PluginContext {
  if (!inputs.projectPath) throw NoProjectOpenedError();
  const pluginContext: PluginContext = {
    root: inputs.projectPath,
    config: new ConfigMap(),
    envInfo: newEnvInfo(),
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
): Promise<Result<Void, FxError>> {
  if (!plugin.scaffold && !plugin.postScaffold)
    return err(PluginHasNoTaskImpl(plugin.displayName, "scaffold"));
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);

  if (plugin.preScaffold) {
    const preRes = await plugin.preScaffold(pluginContext);
    if (preRes.isErr()) {
      return err(preRes.error);
    }
  }

  if (plugin.scaffold) {
    const res = await plugin.scaffold(pluginContext);
    if (res.isErr()) {
      return err(res.error);
    }
  }

  if (plugin.postDeploy) {
    const postRes = await plugin.postDeploy(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
  }
  return ok(Void);
}

export async function generateResourceTemplateAdapter(
  ctx: Context,
  inputs: Inputs,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<ResourceTemplate, FxError>> {
  if (!plugin.generateArmTemplates)
    return err(PluginHasNoTaskImpl(plugin.displayName, "generateArmTemplates"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  const armRes = await plugin.generateArmTemplates(pluginContext);
  if (armRes.isErr()) {
    return err(armRes.error);
  }
  const output: ScaffoldArmTemplateResult = armRes.value as ScaffoldArmTemplateResult;
  const bicepTemplate: BicepTemplate = { kind: "bicep", template: output };
  return ok(bicepTemplate);
}


export async function provisionResourceAdapter(
  ctx: Context,
  inputs: ProvisionInputs,
  provisionInputConfig: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<ResourceProvisionOutput, FxError>> {
  if (!plugin.provision) return err(PluginHasNoTaskImpl(plugin.displayName, "provision"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.appStudioToken = tokenProvider.appStudioToken;
  pluginContext.graphTokenProvider = tokenProvider.graphTokenProvider;
  const json: Json = {};
  Object.assign(json, inputs);
  Object.assign(json, provisionInputConfig.azure);
  const solutionConfig = ConfigMap.fromJSON(json);
  const configOfOtherPlugins = new Map<string, ConfigMap>();
  if (solutionConfig) configOfOtherPlugins.set(GLOBAL_CONFIG, solutionConfig);
  pluginContext.config = new ConfigMap();
  pluginContext.envInfo = newEnvInfo();
  pluginContext.envInfo.profile = configOfOtherPlugins;
  pluginContext.envInfo.config = provisionInputConfig as EnvConfig;
  if (plugin.preProvision) {
    const preRes = await plugin.preProvision(pluginContext);
    if (preRes.isErr()) {
      return err(preRes.error);
    }
  }
  const res = await plugin.provision(pluginContext);
  if (res.isErr()) {
    return err(res.error);
  }
  if (plugin.postProvision) {
    const postRes = await plugin.postProvision(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
  }
  const output = pluginContext.config.toJSON();
  //separate secret keys from output
  const secrets:Json = {};
  for(const key of Object.keys(output)) {
    if(CryptoDataMatchers.has(`${plugin.name}.${key}`)){
      secrets[key] = output[key];
      delete output[key];
    }
  }
  return ok({output: output, secrets: secrets});
}

export async function configureResourceAdapter(
  ctx: Context,
  inputs: ProvisionInputs,
  provisionInputConfig: Json,
  provisionOutputs: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<Void, FxError>> {
  if (!plugin.postProvision) return err(PluginHasNoTaskImpl(plugin.displayName, "postProvision"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  setConfigs(plugin.name, pluginContext, provisionOutputs);
  pluginContext.envInfo.config = provisionInputConfig as EnvConfig;
  const postRes = await plugin.postProvision(pluginContext);
  if (postRes.isErr()) {
    return err(postRes.error);
  }
  setProvisionOutputs(provisionOutputs, pluginContext);
  return ok(Void);
}

export async function deployAdapter(
  ctx: Context,
  inputs: DeploymentInputs,
  provisionOutput: Json,
  tokenProvider: AzureAccountProvider,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<Void, FxError>> {
  if (!plugin.deploy) return err(PluginHasNoTaskImpl(plugin.displayName, "deploy"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider;
  const json: Json = {};
  Object.assign(json, inputs);
  const solutionConfig = ConfigMap.fromJSON(json);
  const configOfOtherPlugins = new Map<string, ConfigMap>();
  if (solutionConfig) configOfOtherPlugins.set(GLOBAL_CONFIG, solutionConfig);
  const config = ConfigMap.fromJSON(provisionOutput);
  if(config) pluginContext.config = config;

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
  if (plugin.postDeploy) {
    const postRes = await plugin.postDeploy(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
  }
  const output = pluginContext.config.toJSON();
  Object.assign(provisionOutput, output);
  return ok(Void);
}

export async function provisionLocalResourceAdapter(
  ctx: Context,
  inputs: Inputs,
  localSettings: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<Json, FxError>> {
  if (!plugin.localDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "localDebug"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.localSettings = {
    teamsApp: ConfigMap.fromJSON(localSettings.teamsApp) || new ConfigMap(),
    auth: ConfigMap.fromJSON(localSettings.auth),
    backend: ConfigMap.fromJSON(localSettings.backend),
    bot: ConfigMap.fromJSON(localSettings.bot),
    frontend: ConfigMap.fromJSON(localSettings.frontend),
  };
  pluginContext.appStudioToken = tokenProvider.appStudioToken;
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.graphTokenProvider = tokenProvider.graphTokenProvider;
  const res = await plugin.localDebug(pluginContext);
  if (res.isErr()) {
    return err(res.error);
  }
  setLocalSettings(localSettings, pluginContext);
  return ok(Void);
}

export async function configureLocalResourceAdapter(
  ctx: Context,
  inputs: Inputs,
  localSettings: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<Json, FxError>> {
  if (!plugin.postLocalDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "postLocalDebug"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.localSettings = {
    teamsApp: ConfigMap.fromJSON(localSettings.teamsApp) || new ConfigMap(),
    auth: ConfigMap.fromJSON(localSettings.auth),
    backend: ConfigMap.fromJSON(localSettings.backend),
    bot: ConfigMap.fromJSON(localSettings.bot),
    frontend: ConfigMap.fromJSON(localSettings.frontend),
  };
  pluginContext.appStudioToken = tokenProvider.appStudioToken;
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.graphTokenProvider = tokenProvider.graphTokenProvider;
  const res = await plugin.postLocalDebug(pluginContext);
  if (res.isErr()) {
    return err(res.error);
  }
  setLocalSettings(localSettings, pluginContext);
  return ok(Void);
}

export async function executeUserTaskAdapter(
  ctx: Context,
  inputs: Inputs,
  func: Func,
  plugin: Plugin
): Promise<Result<unknown, FxError>> {
  if (!plugin.executeUserTask)
    return err(PluginHasNoTaskImpl(plugin.displayName, "executeUserTask"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  const res = await plugin.executeUserTask(func, pluginContext);
  if (res.isErr()) return err(res.error);
  return ok(res.value);
}

export async function getQuestionsForScaffoldingAdapter(
  ctx: Context,
  inputs: Inputs,
  plugin: Plugin
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!plugin.getQuestions) return err(PluginHasNoTaskImpl(plugin.displayName, "getQuestions"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  return await plugin.getQuestions(Stage.create, pluginContext);
}
export function getArmOutput(ctx: PluginContext, key: string): string | undefined {
  const solutionConfig = ctx.envInfo.profile.get("solution");
  const output = solutionConfig?.get(ARM_TEMPLATE_OUTPUT);
  return output?.[key]?.value;
}

function setConfigs(pluginName: string, pluginContext: PluginContext, provisionOutputs: Json) {
  const envInfo = newEnvInfo();
  for (const key in provisionOutputs) {
    const output = provisionOutputs[key];
    const configMap = ConfigMap.fromJSON(output);
    if (configMap) envInfo.profile.set(key, configMap);
  }
  const selfConfigMap = envInfo.profile.get(pluginName) || new ConfigMap();
  pluginContext.config = selfConfigMap;
  pluginContext.envInfo = envInfo;
}


function setProvisionOutputs(provisionOutputs: Json, pluginContext: PluginContext){
  for(const key of pluginContext.envInfo.profile.keys()) {
    const map = pluginContext.envInfo.profile.get(key) as ConfigMap;
    const value = map?.toJSON();
    if(value){
      provisionOutputs[key] = value;
    }
  }
}

function setLocalSettings(localSettings: Json, pluginContext: PluginContext) {
  localSettings.teamsApp = pluginContext.localSettings?.teamsApp?.toJSON();
  localSettings.auth = pluginContext.localSettings?.auth?.toJSON();
  localSettings.backend = pluginContext.localSettings?.backend?.toJSON();
  localSettings.bot = pluginContext.localSettings?.bot?.toJSON();
  localSettings.frontend = pluginContext.localSettings?.frontend?.toJSON();
}