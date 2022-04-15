// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { Inputs, Json, ProjectSettings, v2, Func, TokenProvider } from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ApiConnectorImpl } from "./plugin";
import { DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorResult, ResultFactory } from "./result";
import { ErrorMessage } from "./errors";

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
    return await this.apiConnectorImpl.generateQuestion(ctx, inputs);
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<ApiConnectorResult> {
    if (func.method != "connectExistingApi") {
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorRouteError.name,
        ErrorMessage.ApiConnectorRouteError.message(func.method)
      );
    }
    await this.apiConnectorImpl.scaffold(ctx, inputs);
    return ResultFactory.Success();
  }
}
