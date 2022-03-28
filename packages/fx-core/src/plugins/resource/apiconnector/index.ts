// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import {
  AzureSolutionSettings,
  Inputs,
  Json,
  ProjectSettings,
  SystemError,
  v2,
  err,
  Func,
  ok,
  TokenProvider,
  QTreeNode,
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ApiConnectorImpl } from "./plugin";
import { Constants } from "./constants";
import { DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorResult, ResultFactory } from "./result";

@Service(ResourcePluginsV2.ApiConnectorPlugin)
export class ApiConnectorPluginV2 implements ResourcePlugin {
  name = "fx-resource-api-connector";
  displayName = "Microsoft Api Connector";
  apiConnectorImpl: ApiConnectorImpl = new ApiConnectorImpl();

  activate(projectSettings: ProjectSettings): boolean {
    return true;
  }

  public async getQuestionsForUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<ApiConnectorResult> {
    const activeResourcePlugins = (ctx.projectSetting.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    if (!activeResourcePlugins) {
      throw ResultFactory.UserError("no plugins", "no plugins");
    }
    const res: QTreeNode = this.apiConnectorImpl.generateQuestion(activeResourcePlugins);
    return ok(res);
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<ApiConnectorResult> {
    if (func.method != "addApiConnector") {
      return err(
        new SystemError(
          Constants.PLUGIN_NAME,
          "FunctionRouterError",
          `Failed to route function call:${JSON.stringify(func)}`
        )
      );
    }
    await this.apiConnectorImpl.scaffold(ctx, inputs);
    return ResultFactory.Success();
  }
}
