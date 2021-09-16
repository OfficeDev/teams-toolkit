// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  AzureAccountProvider,
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
  Stage,
  TokenProvider,
  traverse,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeploymentInputs,
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
  configureLocalResourceAdapter,
  configureResourceAdapter,
  convert2PluginContext,
  deployAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
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

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
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
  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    provisionOutput: Json,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return await deployAdapter(ctx, inputs, provisionOutput, tokenProvider, this.plugin);
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func
  ): Promise<Result<unknown, FxError>> {
    return await executeUserTaskAdapter(ctx, inputs, func, this.plugin);
  }
  
  async getQuestions(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await getQuestionsAdapter(ctx, inputs, this.plugin);
  }

  async publishApplication(
    ctx: Context,
    inputs: Inputs,
    provisionInputConfig: Json,
    provisionOutputs: Json,
    tokenProvider: AppStudioTokenProvider
  ): Promise<Result<Void, FxError>> {
    const pluginContext: PluginContext = convert2PluginContext(ctx, inputs);
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
    for (const key in provisionOutputs) {
      const output = provisionOutputs[key];
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
}
