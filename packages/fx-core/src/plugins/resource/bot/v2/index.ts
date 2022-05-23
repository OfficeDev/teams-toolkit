// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  err,
  Func,
  FxError,
  Inputs,
  Json,
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
import { TeamsBot } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  configureResourceAdapter,
  executeUserTaskAdapter,
  getQuestionsForScaffoldingAdapter,
  getQuestionsForUserTaskAdapter,
  provisionLocalResourceAdapter,
  provisionResourceAdapter,
} from "../../utils4v2";
import { Logger } from "../logger";
import { PluginBot } from "../resources/strings";
import { TeamsBotV2Impl } from "./plugin";
import { ProgressBarFactory } from "../progressBars";

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
    return catchAndThrow(() => this.impl.scaffoldSourceCode(ctx, inputs));
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    Logger.setLogger(ctx.logProvider);
    return catchAndThrow(() => this.impl.generateResourceTemplate(ctx, inputs));
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    Logger.setLogger(ctx.logProvider);
    return catchAndThrow(() => this.impl.updateResourceTemplate(ctx, inputs));
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
    return catchAndThrow(() => this.impl.deploy(ctx, inputs, envInfo, tokenProvider));
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

async function catchAndThrow<T>(
  fn: () => Promise<Result<T, FxError>>
): Promise<Result<T, FxError>> {
  try {
    return await fn();
  } catch (error: unknown) {
    await ProgressBarFactory.closeProgressBar(false); // Close all progress bars.
    if (error instanceof Error) {
      Logger.error(error.message);
    }
    return err(error as FxError);
  }
}
