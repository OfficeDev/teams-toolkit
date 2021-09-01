// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureAccountProvider,
  ConfigMap,
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
} from "@microsoft/teamsfx-api";
import {
  BicepTemplate,
  Context,
  DeploymentInputs,
  LocalSettings,
  PluginName,
  ProvisionInputs,
  ProvisionOutput,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { ArmResourcePlugin, ScaffoldArmTemplateResult } from "../../common/armInterface";
import { NoProjectOpenedError, PluginHasNoTaskImpl } from "../../core";
import { GLOBAL_CONFIG, ARM_TEMPLATE_OUTPUT } from "../solution/fx-solution/constants";

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

  const output = pluginContext.config.toJSON();
  return ok({ output: output });
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
  inputs: Readonly<ProvisionInputs>,
  provisionTemplate: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<ProvisionOutput, FxError>> {
  if (!plugin.provision) return err(PluginHasNoTaskImpl(plugin.displayName, "provision"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.appStudioToken = tokenProvider.appStudioToken;
  pluginContext.graphTokenProvider = tokenProvider.graphTokenProvider;
  const selfConfigMap = ConfigMap.fromJSON(provisionTemplate) || new ConfigMap();
  pluginContext.config = selfConfigMap;
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
  const output: ProvisionOutput = {
    output: selfConfigMap.toJSON(),
    states: {},
    secrets: {},
  };
  return ok(output);
}

export async function configureResourceAdapter(
  ctx: Context,
  inputs: Readonly<ProvisionInputs>,
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
  if (plugin.postDeploy) {
    const postRes = await plugin.postDeploy(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
  }
  const deployOutput = selfConfigMap.toJSON();
  return ok({ output: deployOutput });
}

export async function provisionLocalResourceAdapter(
  ctx: Context,
  inputs: Inputs,
  localSettings: LocalSettings,
  tokenProvider: TokenProvider,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<LocalSettings, FxError>> {
  if (!plugin.localDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "localDebug"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.localSettings = {
    teamsApp: ConfigMap.fromJSON(localSettings.teamsApp)!,
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
  localSettings.teamsApp = pluginContext.localSettings.teamsApp.toJSON();
  if (pluginContext.localSettings.auth) {
    localSettings.auth = pluginContext.localSettings.auth.toJSON();
  }
  if (pluginContext.localSettings.backend) {
    localSettings.backend = pluginContext.localSettings.backend.toJSON();
  }
  if (pluginContext.localSettings.bot) {
    localSettings.bot = pluginContext.localSettings.bot.toJSON();
  }
  if (pluginContext.localSettings.frontend) {
    localSettings.frontend = pluginContext.localSettings.frontend.toJSON();
  }
  return ok(localSettings);
}

export async function configureLocalResourceAdapter(
  ctx: Context,
  inputs: Inputs,
  localSettings: LocalSettings,
  tokenProvider: TokenProvider,
  plugin: Plugin & ArmResourcePlugin
): Promise<Result<LocalSettings, FxError>> {
  if (!plugin.postLocalDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "postLocalDebug"));
  const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
  pluginContext.localSettings = {
    teamsApp: ConfigMap.fromJSON(localSettings.teamsApp)!,
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
  localSettings.teamsApp = pluginContext.localSettings.teamsApp.toJSON();
  if (pluginContext.localSettings.auth) {
    localSettings.auth = pluginContext.localSettings.auth.toJSON();
  }
  if (pluginContext.localSettings.backend) {
    localSettings.backend = pluginContext.localSettings.backend.toJSON();
  }
  if (pluginContext.localSettings.bot) {
    localSettings.bot = pluginContext.localSettings.bot.toJSON();
  }
  if (pluginContext.localSettings.frontend) {
    localSettings.frontend = pluginContext.localSettings.frontend.toJSON();
  }
  return ok(localSettings);
}

export async function executeUserTaskAdapter(
  ctx: Context,
  func: Func,
  inputs: Inputs,
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
  const solutionConfig = ctx.configOfOtherPlugins.get("solution");
  const output = solutionConfig?.get(ARM_TEMPLATE_OUTPUT);
  return output?.[key]?.value;
}
