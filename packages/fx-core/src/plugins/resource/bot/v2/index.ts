// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  Json,
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
  DeploymentInputs,
  DeepReadonly,
  ProvisionInputs,
  ResourcePlugin,
  ResourceTemplate,
  EnvInfoV2,
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { TeamsBot } from "../index";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  configureResourceAdapter,
  convert2PluginContext,
  executeUserTaskAdapter,
  getQuestionsForScaffoldingAdapter,
  getQuestionsForUserTaskAdapter,
  provisionLocalResourceAdapter,
  provisionResourceAdapter,
  setEnvInfoV1ByStateV2,
} from "../../utils4v2";
import { Logger } from "../logger";
import { PluginBot } from "../resources/strings";
import { TeamsBotV2Impl } from "./plugin";
import { runWithExceptionCatching } from "../errors";
import { LifecycleFuncNames } from "../constants";

@Service(ResourcePluginsV2.BotPlugin)
export class BotPluginV2 implements ResourcePlugin {
  name = PluginBot.PLUGIN_NAME;
  displayName = "Bot";
  @Inject(ResourcePlugins.BotPlugin)
  plugin!: TeamsBot;
  impl = new TeamsBotV2Impl();

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return this.plugin.activate(solutionSettings);
  }

  async getQuestionsForScaffolding(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsForScaffoldingAdapter(ctx, inputs, this.plugin);
  }

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    Logger.setLogger(ctx.logProvider);
    return runWithExceptionCatching(
      getV1Context(ctx, inputs),
      () => this.impl.scaffoldSourceCode(ctx, inputs),
      true,
      LifecycleFuncNames.SCAFFOLD
    );
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    Logger.setLogger(ctx.logProvider);
    return runWithExceptionCatching(
      getV1Context(ctx, inputs),
      () => this.impl.generateResourceTemplate(ctx, inputs),
      true,
      LifecycleFuncNames.GENERATE_ARM_TEMPLATES
    );
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    Logger.setLogger(ctx.logProvider);
    return runWithExceptionCatching(
      getV1Context(ctx, inputs),
      () => this.impl.updateResourceTemplate(ctx, inputs),
      true,
      LifecycleFuncNames.GENERATE_ARM_TEMPLATES
    );
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
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await configureResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }
  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: EnvInfoV2
  ): Promise<Result<Void, FxError>> {
    return await provisionLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
      tokenProvider,
      this.plugin,
      envInfo
    );
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

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    Logger.setLogger(ctx.logProvider);
    return runWithExceptionCatching(
      getV1Context(ctx, inputs, envInfo),
      () => this.impl.deploy(ctx, inputs, envInfo, tokenProvider),
      true,
      LifecycleFuncNames.DEPLOY
    );
  }

  async getQuestionsForUserTask(
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsForUserTaskAdapter(
      ctx,
      inputs,
      func,
      envInfo,
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
}

function getV1Context(ctx: Context, inputs: Inputs, envInfo?: v2.EnvInfoV2): PluginContext {
  const context = convert2PluginContext(PluginBot.PLUGIN_NAME, ctx, inputs, true);
  if (envInfo) {
    setEnvInfoV1ByStateV2(PluginBot.PLUGIN_NAME, context, envInfo);
  }
  return context;
}
