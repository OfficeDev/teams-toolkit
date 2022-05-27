// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  M365TokenProvider,
  AzureSolutionSettings,
  Plugin,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  ok,
  PluginContext,
  ProjectSettings,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeepReadonly,
  EnvInfoV2,
  ProvisionInputs,
  ResourcePlugin,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { isDeployManifestEnabled } from "../../../../common";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  collaborationApiAdaptor,
  configureLocalResourceAdapter,
  configureResourceAdapter,
  convert2PluginContext,
  deployAdapter,
  executeUserTaskAdapter,
  getQuestionsAdapter,
  provisionResourceAdapter,
  scaffoldSourceCodeAdapter,
  setEnvInfoV1ByStateV2,
} from "../../utils4v2";

@Service(ResourcePluginsV2.AppStudioPlugin)
export class AppStudioPluginV2 implements ResourcePlugin {
  name = "fx-resource-appstudio";
  displayName = "App Studio";
  @Inject(ResourcePlugins.AppStudioPlugin)
  plugin!: Plugin;

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return this.plugin.activate(solutionSettings);
  }

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  deploy = isDeployManifestEnabled() ? this._deploy : undefined;

  async _deploy(
    ctx: v2.Context,
    inputs: v2.DeploymentInputs,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return deployAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async provisionResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async configureResource(
    ctx: Context,
    inputs: Readonly<ProvisionInputs>,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await configureResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: EnvInfoV2
  ): Promise<Result<Void, FxError>> {
    return await configureLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
      tokenProvider,
      this.plugin,
      envInfo
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
    tokenProvider: M365TokenProvider
  ): Promise<Result<Void, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(this.plugin.name, ctx, inputs);
    setEnvInfoV1ByStateV2(this.plugin.name, pluginContext, envInfo);
    pluginContext.m365TokenProvider = tokenProvider;

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
    //TODO pass provisionInputConfig into config??
    const postRes = await this.plugin.publish!(pluginContext);
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
