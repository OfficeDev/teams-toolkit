// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap,
  EnvConfig,
  err,
  FxError,
  ok,
  Plugin,
  PluginContext,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Context, InputsWithProjectPath } from "@microsoft/teamsfx-api/build/v2";
import { CloudResource } from "../../../../api/build/v3";
import { InvalidStateError, PluginHasNoTaskImpl } from "../../core/error";
import { newEnvInfo } from "../../core/tools";
import { convert2PluginContext, flattenConfigMap } from "./utils4v2";

export async function provisionResourceAdapterV3(
  ctx: Context,
  inputs: InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider,
  plugin: Plugin
): Promise<Result<v3.CloudResource, FxError>> {
  if (!plugin.provision) {
    return err(PluginHasNoTaskImpl(plugin.displayName, "provision"));
  }
  const state: ConfigMap | undefined = ConfigMap.fromJSON(envInfo.state);
  if (!state) {
    return err(InvalidStateError(plugin.name, envInfo.state));
  }
  const pluginContext: PluginContext = convert2PluginContext(plugin.name, ctx, inputs);
  pluginContext.azureAccountProvider = tokenProvider.azureAccountProvider;
  pluginContext.appStudioToken = tokenProvider.appStudioToken;
  pluginContext.graphTokenProvider = tokenProvider.graphTokenProvider;
  pluginContext.envInfo = newEnvInfo();
  pluginContext.envInfo.envName = envInfo.envName;
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
  const finalResource = (
    pluginContext.envInfo.state.get(plugin.name) as ConfigMap
  ).toJSON() as CloudResource;
  return ok(finalResource);
}

export async function configureResourceAdapterV3(
  ctx: Context,
  inputs: InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
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
  pluginContext.appStudioToken = tokenProvider.appStudioToken;
  pluginContext.graphTokenProvider = tokenProvider.graphTokenProvider;
  pluginContext.envInfo = newEnvInfo();
  pluginContext.envInfo.state = flattenConfigMap(state);
  pluginContext.envInfo.config = envInfo.config as EnvConfig;
  pluginContext.config = pluginContext.envInfo.state.get(plugin.name) ?? new ConfigMap();

  const postRes = await plugin.postProvision(pluginContext);
  if (postRes.isErr()) {
    return err(postRes.error);
  }
  return ok(Void);
}
