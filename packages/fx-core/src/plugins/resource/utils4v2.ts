// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap,
  ConfigValue,
  EnvConfig,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  LocalSettings,
  ok,
  OptionItem,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
  TokenProvider,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import _ from "lodash";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { ArmTemplateResult } from "../../common/armInterface";
import { isConfigUnifyEnabled, objectToMap } from "../../common/tools";
import { InvalidStateError, NoProjectOpenedError, PluginHasNoTaskImpl } from "../../core/error";
import { GLOBAL_CONFIG } from "../solution/fx-solution/constants";
import { EnvInfoV2, InputsWithProjectPath } from "@microsoft/teamsfx-api/build/v2";
import { newEnvInfo } from "../../core/environment";

export function convert2PluginContext(
  pluginName: string,
  ctx: v2.Context,
  inputs: Inputs,
  ignoreEmptyProjectPath = false
): PluginContext {
  if (!ignoreEmptyProjectPath && !inputs.projectPath) throw new NoProjectOpenedError();
  const envInfo = newEnvInfo(inputs.env);
  const config = new ConfigMap();
  envInfo.state.set(pluginName, config);
  const pluginContext: PluginContext = {
    root: inputs.projectPath || "",
    config: config,
    envInfo: envInfo,
    projectSettings: ctx.projectSetting,
    answers: inputs,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    cryptoProvider: ctx.cryptoProvider,
    permissionRequestProvider: ctx.permissionRequestProvider,
    ui: ctx.userInteraction,
  };
  return pluginContext;
}

export function convert2Context(ctx: PluginContext, ignoreEmptyProjectPath = false) {
  if (!ignoreEmptyProjectPath && !ctx.answers!.projectPath) throw new NoProjectOpenedError();
  const inputs: InputsWithProjectPath = {
    projectPath: ctx.root,
    env: ctx.envInfo.envName,
    platform: ctx.answers!.platform!,
  };
  const context: v2.Context = {
    projectSetting: ctx.projectSettings!,
    logProvider: ctx.logProvider!,
    telemetryReporter: ctx.telemetryReporter!,
    cryptoProvider: ctx.cryptoProvider,
    permissionRequestProvider: ctx.permissionRequestProvider,
    userInteraction: ctx.ui!,
  };
  return { context, inputs };
}

export async function scaffoldSourceCodeAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  plugin: Plugin
): Promise<Result<Void, FxError>> {
  if (!plugin.scaffold && !plugin.postScaffold)
    return err(PluginHasNoTaskImpl(plugin.displayName, "scaffold"));
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  const localSettingsProvider = new LocalSettingsProvider(pluginContext.root);
  pluginContext.localSettings = await localSettingsProvider.load(pluginContext.cryptoProvider);

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

  if (plugin.postScaffold) {
    const postRes = await plugin.postScaffold(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
  }
  return ok(Void);
}

export async function generateResourceTemplateAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  plugin: Plugin
): Promise<Result<v2.ResourceTemplate, FxError>> {
  if (!plugin.generateArmTemplates)
    return err(PluginHasNoTaskImpl(plugin.displayName, "generateArmTemplates"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  const armRes = await plugin.generateArmTemplates(pluginContext);
  if (armRes.isErr()) {
    return err(armRes.error);
  }
  const output: ArmTemplateResult = armRes.value as ArmTemplateResult;
  const bicepTemplate: v2.BicepTemplate = { kind: "bicep", template: output };
  return ok(bicepTemplate);
}
export async function updateResourceTemplateAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  plugin: Plugin
): Promise<Result<v2.ResourceTemplate, FxError>> {
  if (!plugin.updateArmTemplates)
    return err(PluginHasNoTaskImpl(plugin.displayName, "updateArmTemplates"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  const armRes = await plugin.updateArmTemplates(pluginContext);
  if (armRes.isErr()) {
    return err(armRes.error);
  }
  const output: ArmTemplateResult = armRes.value as ArmTemplateResult;
  const bicepTemplate: v2.BicepTemplate = { kind: "bicep", template: output };
  return ok(bicepTemplate);
}
export async function provisionResourceAdapter(
  ctx: v2.Context,
  inputs: v2.ProvisionInputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<Void, FxError>> {
  if (!plugin.provision) {
    return err(PluginHasNoTaskImpl(plugin.displayName, "provision"));
  }
  const state: ConfigMap | undefined = ConfigMap.fromJSON(envInfo.state);
  if (!state) {
    return err(InvalidStateError(plugin.name, envInfo.state));
  }
  const solutionInputs: v2.SolutionInputs = inputs;
  state.set(GLOBAL_CONFIG, ConfigMap.fromJSON(solutionInputs));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  pluginContext.envInfo.state = flattenConfigMap(state);
  pluginContext.envInfo.config = envInfo.config as EnvConfig;
  pluginContext.config = pluginContext.envInfo.state.get(plugin.name) ?? new ConfigMap();
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
  pluginContext.envInfo.state.delete(GLOBAL_CONFIG);
  envInfo.state[plugin.name] = pluginContext.config.toJSON();
  return ok(Void);
}

// flattens output/secrets fields in config map for backward compatibility
export function flattenConfigMap(configMap: ConfigMap): ConfigMap {
  return configMap;
}

// Convert legacy config map to env state with output and secrets fields
export function legacyConfig2EnvState(config: ConfigMap, pluginName: string): Json {
  const output = config.toJSON();
  return output;
}

export async function configureResourceAdapter(
  ctx: v2.Context,
  inputs: v2.ProvisionInputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<Void, FxError>> {
  if (!plugin.postProvision) return err(PluginHasNoTaskImpl(plugin.displayName, "postProvision"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);

  const state: ConfigMap | undefined = ConfigMap.fromJSON(envInfo.state);
  if (!state) {
    return err(InvalidStateError(plugin.name, envInfo.state));
  }
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  pluginContext.envInfo.state = flattenConfigMap(state);
  pluginContext.envInfo.config = envInfo.config as EnvConfig;
  pluginContext.config = pluginContext.envInfo.state.get(plugin.name) ?? new ConfigMap();

  const postRes = await plugin.postProvision(pluginContext);
  if (postRes.isErr()) {
    return err(postRes.error);
  }
  envInfo.state[plugin.name] = pluginContext.config.toJSON();
  return ok(Void);
}

export async function deployAdapter(
  ctx: v2.Context,
  inputs: v2.DeploymentInputs,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<Void, FxError>> {
  if (!plugin.deploy) return err(PluginHasNoTaskImpl(plugin.displayName, "deploy"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  setEnvInfoV1ByStateV2(plugin.name, pluginContext, envInfo);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;

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
  // We are making an exception for APIM plugin to modify envInfo, which should be immutable
  // during deployment. Becasue it is the only plugin that needs to do so. Remove the following
  // line after APIM is refactored not to change env state.
  setStateV2ByConfigMapInc(plugin.name, envInfo.state, pluginContext.config);
  return ok(Void);
}

/**
 * An adaptor that behaves like a ConfigMap for plugin local settings,
 * but modifies plugin settings json in-place when setting values.
 */
class ConfigMapAdaptor implements ConfigMap {
  private _pluginSettings: Json;
  private _map: ConfigMap;

  constructor(pluginName: string, json: Json) {
    this._pluginSettings = json;
    const map = ConfigMap.fromJSON(json);
    if (!map) {
      throw InvalidStateError(pluginName, json);
    }
    this._map = map;
    this.size = this._map.size;
  }
  getString(k: string, defaultValue?: string): string | undefined {
    return this._map.getString(k, defaultValue);
  }
  getBoolean(k: string, defaultValue?: boolean): boolean | undefined {
    return this._map.getBoolean(k, defaultValue);
  }
  getNumber(k: string, defaultValue?: number): number | undefined {
    return this._map.getNumber(k, defaultValue);
  }
  getStringArray(k: string, defaultValue?: string[]): string[] | undefined {
    return this._map.getStringArray(k, defaultValue);
  }
  getNumberArray(k: string, defaultValue?: number[]): number[] | undefined {
    return this._map.getNumberArray(k, defaultValue);
  }
  getBooleanArray(k: string, defaultValue?: boolean[]): boolean[] | undefined {
    return this._map.getBooleanArray(k, defaultValue);
  }
  getOptionItem(k: string, defaultValue?: OptionItem): OptionItem | undefined {
    return this._map.getOptionItem(k, defaultValue);
  }
  getOptionItemArray(k: string, defaultValue?: OptionItem[]): OptionItem[] | undefined {
    return this._map.getOptionItemArray(k, defaultValue);
  }
  toJSON(): Json {
    return this._pluginSettings;
  }
  clear(): void {
    Object.keys(this._pluginSettings).forEach((key) => delete this._pluginSettings[key]);
    return this._map.clear();
  }
  delete(key: string): boolean {
    const deleted = this._map.delete(key);
    if (deleted) {
      delete this._pluginSettings[key];
    }
    return deleted;
  }
  forEach(
    callbackfn: (value: any, key: string, map: Map<string, any>) => void,
    thisArg?: any
  ): void {
    return this._map.forEach(callbackfn, thisArg);
  }
  get(key: string) {
    return this._map.get(key);
  }
  has(key: string): boolean {
    return this._map.has(key);
  }
  size: number;
  entries(): IterableIterator<[string, any]> {
    return this._map.entries();
  }
  keys(): IterableIterator<string> {
    return this._map.keys();
  }
  values(): IterableIterator<any> {
    return this._map.values();
  }
  [Symbol.iterator](): IterableIterator<[string, any]> {
    return this._map.entries();
  }
  [Symbol.toStringTag]: string;

  set(key: string, value: ConfigValue): this {
    this._map.set(key, value);
    this._pluginSettings[key] = value;
    this.size = this._map.size;
    return this;
  }
}

/**
 * a Json backed LocalSettings which keeps localSettings Json and ConfigMap in sync
 */
class LocalSettingsAdaptor implements LocalSettings {
  teamsApp?: ConfigMap;
  auth?: ConfigMap;
  frontend?: ConfigMap;
  backend?: ConfigMap;
  bot?: ConfigMap;

  constructor(localSettings: Json, pluginName: string) {
    if (localSettings && localSettings["teamsApp"]) {
      this.teamsApp = new ConfigMapAdaptor(pluginName, localSettings["teamsApp"]);
    }
    if (localSettings && localSettings["auth"]) {
      this.auth = new ConfigMapAdaptor(pluginName, localSettings["auth"]);
    }
    if (localSettings && localSettings["frontend"]) {
      this.frontend = new ConfigMapAdaptor(pluginName, localSettings["frontend"]);
    }
    if (localSettings && localSettings["backend"]) {
      this.backend = new ConfigMapAdaptor(pluginName, localSettings["backend"]);
    }
    if (localSettings && localSettings["bot"]) {
      this.bot = new ConfigMapAdaptor(pluginName, localSettings["bot"]);
    }
  }
}

export async function provisionLocalResourceAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin,
  envInfo?: EnvInfoV2
): Promise<Result<Void, FxError>> {
  if (!plugin.localDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "localDebug"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  if (isConfigUnifyEnabled() && envInfo) {
    pluginContext.envInfo.state = objectToMap(envInfo!.state);
    pluginContext.envInfo.config = envInfo.config as EnvConfig;
  }
  if (!pluginContext.envInfo.state.get(plugin.name)) {
    pluginContext.envInfo.state.set(plugin.name, pluginContext.config);
  }
  const localSettingsAdaptor = new LocalSettingsAdaptor(localSettings, plugin.name);
  pluginContext.localSettings = localSettingsAdaptor;
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  const res = await plugin.localDebug(pluginContext);
  if (res.isErr()) {
    return err(res.error);
  }
  if (isConfigUnifyEnabled() && envInfo) {
    envInfo!.state[plugin.name] = pluginContext.envInfo.state.get(plugin.name).toJSON();
  }
  return ok(Void);
}

export async function configureLocalResourceAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  tokenProvider: TokenProvider,
  plugin: Plugin,
  envInfo?: EnvInfoV2
): Promise<Result<Void, FxError>> {
  if (!plugin.postLocalDebug) return err(PluginHasNoTaskImpl(plugin.displayName, "postLocalDebug"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  if (isConfigUnifyEnabled() && envInfo) {
    pluginContext.envInfo.state = objectToMap(envInfo!.state);
    pluginContext.envInfo.config = envInfo!.config as EnvConfig;
  }
  if (envInfo?.config.isLocalDebug) {
    pluginContext.envInfo.config.isLocalDebug = true;
  }
  if (!pluginContext.envInfo.state.get(plugin.name)) {
    pluginContext.envInfo.state.set(plugin.name, pluginContext.config);
  }
  const localSettingsAdaptor = new LocalSettingsAdaptor(localSettings, plugin.name);
  pluginContext.localSettings = localSettingsAdaptor;
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  const res = await plugin.postLocalDebug(pluginContext);
  if (res.isErr()) {
    return err(res.error);
  }
  if (isConfigUnifyEnabled() && envInfo) {
    envInfo!.state[plugin.name] = pluginContext.envInfo.state.get(plugin.name).toJSON();
  }
  return ok(Void);
}

export async function executeUserTaskAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  localSettings: Json,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<unknown, FxError>> {
  if (!plugin.executeUserTask)
    return err(PluginHasNoTaskImpl(plugin.displayName, "executeUserTask"));
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  setEnvInfoV1ByStateV2(plugin.name, pluginContext, envInfo);
  const localSettingsAdaptor = new LocalSettingsAdaptor(localSettings, plugin.name);
  pluginContext.localSettings = localSettingsAdaptor;
  const res = await plugin.executeUserTask(func, pluginContext);
  if (res.isErr()) return err(res.error);
  setStateV2ByConfigMapInc(plugin.name, envInfo.state, pluginContext.config);
  return ok(res.value);
}

export async function getQuestionsForScaffoldingAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  plugin: Plugin
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!plugin.getQuestions) return ok(undefined);
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs, true);
  return await plugin.getQuestions(Stage.create, pluginContext);
}

export async function getQuestionsAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!plugin.getQuestions) return ok(undefined);
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs, true);
  setEnvInfoV1ByStateV2(plugin.name, pluginContext, envInfo);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  return await plugin.getQuestions(inputs.stage!, pluginContext);
}

export async function getQuestionsForUserTaskAdapter(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (!plugin.getQuestionsForUserTask) return ok(undefined);
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs, true);
  setEnvInfoV1ByStateV2(plugin.name, pluginContext, envInfo);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  return await plugin.getQuestionsForUserTask(func, pluginContext);
}

export function setStateV2ByConfigMapInc(pluginName: string, state: Json, config: ConfigMap): void {
  const pluginConfig = legacyConfig2EnvState(config, pluginName);
  state[pluginName] = _.assign(state[pluginName], pluginConfig);
}

export function setEnvInfoV1ByStateV2(
  pluginName: string,
  pluginContext: PluginContext,
  envInfoV2: v2.EnvInfoV2
): void {
  const envInfo = newEnvInfo();
  let stateV1: ConfigMap | undefined = ConfigMap.fromJSON(envInfoV2.state);
  if (!stateV1) {
    throw InvalidStateError(pluginName, envInfoV2.state);
  }
  stateV1 = flattenConfigMap(stateV1);
  let selfConfigMap: ConfigMap | undefined = stateV1.get(pluginName);
  if (!selfConfigMap) {
    selfConfigMap = new ConfigMap();
    stateV1.set(pluginName, selfConfigMap);
  }
  envInfo.envName = envInfoV2.envName;
  envInfo.config = envInfoV2.config as EnvConfig;
  envInfo.state = stateV1;
  pluginContext.config = selfConfigMap;
  pluginContext.envInfo = envInfo;
}

export function assignJsonInc(target?: Json, source?: Json): Json | undefined {
  if (!target) return source;
  if (!source) return target;
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    if (sourceValue !== undefined) {
      const type = typeof sourceValue;
      if (type === "string") {
        if (sourceValue) {
          target[key] = sourceValue;
        }
      } else {
        target[key] = sourceValue;
      }
    }
  }
  return target;
}

export async function collaborationApiAdaptor(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  userInfo: Json,
  plugin: Plugin,
  taskName: "grantPermission" | "listCollaborator" | "checkPermission"
): Promise<Result<Json, FxError>> {
  const fn = plugin[taskName];
  if (!fn) {
    return err(PluginHasNoTaskImpl(plugin.displayName, taskName));
  }

  const state: ConfigMap | undefined = ConfigMap.fromJSON(envInfo.state);
  if (!state) {
    return err(InvalidStateError(plugin.name, envInfo.state));
  }
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.m365TokenProvider = tokenProvider.m365TokenProvider;
  pluginContext.envInfo.state = flattenConfigMap(state);
  pluginContext.envInfo.config = envInfo.config as EnvConfig;
  pluginContext.config = pluginContext.envInfo.state.get(plugin.name) ?? new ConfigMap();
  return fn.bind(plugin)(pluginContext, userInfo);
}
