// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  Func,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Inject, Service } from "typedi";
import { FrontendPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsNamesV3,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  deployAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  scaffoldSourceCodeAdapter,
  updateResourceTemplateAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsNamesV3.ScaffoldReactTab)
export class ReactTabScaffoldPluginV3 implements v3.ScaffoldPlugin {
  name = ResourcePluginsNamesV3.ScaffoldReactTab;
  displayName = "Tab Front-end V3";
  @Inject(ResourcePlugins.FrontendPlugin)
  plugin!: FrontendPlugin;
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        id: "ReactTab",
        language: "javascript/typescript",
        description: "React Tab for javascript",
        modules: ["tab"],
      },
    ]);
  }
  async scaffold(ctx: v2.Context, inputs: v3.ScaffoldInputs): Promise<Result<Void, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }
}

@Service(ResourcePluginsNamesV3.AzureStoragePlugin)
export class AzureStoragePluginV3 implements v3.ResourcePlugin {
  name = ResourcePluginsNamesV3.AzureStoragePlugin;
  resourceType = "AzureStorage";
  description = "Azure Storage";
  modules: (keyof v3.Modules)[] = ["tab"];
  @Inject(ResourcePlugins.FrontendPlugin)
  plugin!: FrontendPlugin;
  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
  async updateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return await updateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
  // async provisionResource(
  //   ctx: v2.Context,
  //   inputs: v2.InputsWithProjectPath,
  //   envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  //   tokenProvider: TokenProvider
  // ): Promise<Result<v3.EnvInfoV3, FxError>> {
  //   return provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  // }
  // async configureResource(
  //   ctx: v2.Context,
  //   inputs: v2.InputsWithProjectPath,
  //   envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  //   tokenProvider: TokenProvider
  // ): Promise<Result<Void, FxError>> {
  //   return await configureResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  // }
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return await deployAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }
  async executeUserTask(
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v3.EnvInfoV3,
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
