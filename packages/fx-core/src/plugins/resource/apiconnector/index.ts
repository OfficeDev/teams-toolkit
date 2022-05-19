// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import {
  Inputs,
  Json,
  ProjectSettings,
  AzureSolutionSettings,
  v2,
  Func,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ApiConnectorImpl } from "./plugin";
import { DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import { FxResult, ResultFactory, QuestionResult } from "./result";
import { ErrorMessage } from "./errors";
import { UserTaskFunctionName } from "../../solution/fx-solution/constants";
import { HostTypeOptionAzure } from "../../solution/fx-solution/question";
@Service(ResourcePluginsV2.ApiConnectorPlugin)
export class ApiConnectorPluginV2 implements ResourcePlugin {
  name = "fx-resource-api-connector";
  displayName = "Microsoft Api Connector";
  apiConnectorImpl: ApiConnectorImpl = new ApiConnectorImpl();

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    return solutionSettings.hostType === HostTypeOptionAzure.id;
  }

  public async getQuestionsForUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<QuestionResult> {
    return await this.apiConnectorImpl.generateQuestion(ctx, inputs);
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<FxResult> {
    if (func.method != UserTaskFunctionName.ConnectExistingApi) {
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorRouteError.name,
        ErrorMessage.ApiConnectorRouteError.message(func.method)
      );
    }
    const result = await this.apiConnectorImpl.scaffold(ctx, inputs);
    return ResultFactory.Success({ func: UserTaskFunctionName.ConnectExistingApi, ...result });
  }
}
