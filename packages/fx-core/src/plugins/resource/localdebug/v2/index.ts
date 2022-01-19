// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  err,
  Func,
  FxError,
  Inputs,
  Json,
  ok,
  ProjectSettings,
  Result,
  TokenProvider,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { LocalDebugPlugin } from "..";
import { AppStudioPlugin } from "../constants";
import { MissingStep } from "../util/error";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import {
  configureLocalResourceAdapter,
  executeUserTaskAdapter,
  provisionLocalResourceAdapter,
  scaffoldSourceCodeAdapter,
} from "../../utils4v2";
import { LocalEnvManager } from "../../../../common/local/localEnvManager";

@Service(ResourcePluginsV2.LocalDebugPlugin)
export class LocalDebugPluginV2 implements ResourcePlugin {
  name = "fx-resource-local-debug";
  displayName = "LocalDebug";
  @Inject(ResourcePlugins.LocalDebugPlugin)
  plugin!: LocalDebugPlugin;
  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return this.plugin.activate(solutionSettings);
  }

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    return await scaffoldSourceCodeAdapter(ctx, inputs, this.plugin);
  }

  async provisionLocalResource(
    ctx: Context,
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
    const localEnvManager = new LocalEnvManager(ctx.logProvider, ctx.telemetryReporter);
    if (func.method == "getLaunchInput") {
      const env = func.params as string;
      if (env === "remote") {
        // return remote teams app id
        if (
          envInfo.state !== undefined &&
          envInfo.state[AppStudioPlugin.Name] !== undefined &&
          envInfo.state[AppStudioPlugin.Name][AppStudioPlugin.TeamsAppId] !== undefined
        ) {
          const remoteId = envInfo.state[AppStudioPlugin.Name][
            AppStudioPlugin.TeamsAppId
          ] as string;
          if (/^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(remoteId)) {
            return ok({
              appId: remoteId,
              env: envInfo.envName,
            });
          }
        }

        return err(MissingStep("launching remote", "Teams: Provision and Teams: Deploy"));
      } else {
        const localTeamsAppId = localSettings?.teamsApp?.teamsAppId as string;
        return ok({ appId: localTeamsAppId });
      }
    } else if (func.method === "getProgrammingLanguage") {
      return ok(ctx.projectSetting.programmingLanguage);
    } else if (func.method === "getSkipNgrokConfig") {
      return ok((localSettings?.bot?.skipNgrok as boolean) === true);
    } else if (func.method === "getLocalDebugEnvs") {
      const localEnvs = await localEnvManager.getLocalDebugEnvs(
        inputs.projectPath as string,
        ctx.projectSetting,
        localSettings
      );
      return ok(localEnvs);
    } else {
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
}
