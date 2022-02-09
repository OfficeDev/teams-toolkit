// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  Json,
  Result,
  TokenProvider,
  Void,
  v2,
  ProjectSettings,
} from "@microsoft/teamsfx-api";
import { Inject, Service } from "typedi";
import { AadAppForTeamsPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  collaborationApiAdaptor,
  configureLocalResourceAdapter,
  configureResourceAdapter,
  executeUserTaskAdapter,
  generateResourceTemplateAdapter,
  provisionLocalResourceAdapter,
  provisionResourceAdapter,
} from "../../utils4v2";

@Service(ResourcePluginsV2.AadPlugin)
export class AadPluginV2 implements v2.ResourcePlugin {
  name = "fx-resource-aad-app-for-teams";
  displayName = "AAD";
  @Inject(ResourcePlugins.AadPlugin)
  plugin!: AadAppForTeamsPlugin;

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return this.plugin.activate(solutionSettings);
  }

  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return await generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await provisionResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async configureResource(
    ctx: v2.Context,
    inputs: v2.ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await configureResourceAdapter(ctx, inputs, envInfo, tokenProvider, this.plugin);
  }

  async provisionLocalResource(
    ctx: v2.Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return await provisionLocalResourceAdapter(
      ctx,
      inputs,
      localSettings,
      tokenProvider,
      this.plugin
    );
  }

  async configureLocalResource(
    ctx: v2.Context,
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
    ctx: v2.Context,
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

  async grantPermission(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
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
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
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
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
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
