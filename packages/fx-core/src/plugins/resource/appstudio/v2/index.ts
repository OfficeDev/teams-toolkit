// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  AzureSolutionSettings,
  ConfigMap,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  ok,
  PluginContext,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeepReadonly,
  ProvisionInputs,
  ResourcePlugin,
  ResourceProvisionOutput,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { AppStudioPlugin } from "..";
import { newEnvInfo } from "../../../..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  collaborationApiAdaptor,
  configureLocalResourceAdapter,
  configureResourceAdapter,
  convert2PluginContext,
  executeUserTaskAdapter,
  getQuestionsAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.AppStudioPlugin)
export class AppStudioPluginV2 implements ResourcePlugin {
  name = "fx-resource-appstudio";
  displayName = "App Studio";
  @Inject(ResourcePlugins.AppStudioPlugin)
  plugin!: AppStudioPlugin;

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: Readonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async configureResource(
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    envInfo: Readonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<ResourceProvisionOutput, FxError>> {
    return await configureResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await configureLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
      tokenProvider,
      this.plugin
    );
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<unknown, FxError>> {
    return await executeUserTaskAdapter(
      ctx,
      inputs,
      func,
      localSettings,
      envInfo,
      tokenProvider,
      this.plugin
    );
  }

  async getQuestions(
    ctx: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async publishApplication(
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: AppStudioTokenProvider
  ): Promise<Result<Void, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(this.plugin.name, ctx, inputs);
    pluginContext.appStudioToken = tokenProvider;

    // run question model for publish
    // const getQuestionRes = await this.plugin.getQuestions(Stage.publish, pluginContext);
    // if (getQuestionRes.isOk()) {
    //   const node = getQuestionRes.value;
    //   if (node) {
    //     const res = await traverse(node, inputs, ctx.userInteraction);
    //     if (res.isErr()) {
    //       return err(res.error);
    //     }
    //   }
    // }
    const configsOfOtherPlugins = new Map<string, ConfigMap>();
    for (const key in envInfo.state) {
      const output = envInfo.state[key];
      const configMap = ConfigMap.fromJSON(output);
      if (configMap) configsOfOtherPlugins.set(key, configMap);
    }
    pluginContext.envInfo = newEnvInfo(undefined, undefined, configsOfOtherPlugins);
    //TODO pass provisionInputConfig into config??
    const postRes = await this.plugin.publish(pluginContext);
    if (postRes.isErr()) {
      return err(postRes.error);
    }
    return ok(Void);
  }

  async grantPermission(
    ctx: Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider,
    userInfo: Json
  ): Promise<Result<Json, FxError>> {
    return collaborationApiAdaptor(
      ctx,
      inputs,
      envInfo,
      tokenProvider,
      userInfo,
      this.plugin,
      "grantPermission"
    );
  }

  async checkPermission(
    ctx: Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider,
    userInfo: Json
  ): Promise<Result<Json, FxError>> {
    return collaborationApiAdaptor(
      ctx,
      inputs,
      envInfo,
      tokenProvider,
      userInfo,
      this.plugin,
      "checkPermission"
    );
  }

  async listCollaborator(
    ctx: Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider,
    userInfo: Json
  ): Promise<Result<Json, FxError>> {
    return collaborationApiAdaptor(
      ctx,
      inputs,
      envInfo,
      tokenProvider,
      userInfo,
      this.plugin,
      "listCollaborator"
    );
  }
}
