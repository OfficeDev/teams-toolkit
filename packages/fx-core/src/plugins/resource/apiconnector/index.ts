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
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ApiConnectorImpl } from "./plugin";
import { DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorResult, ResultFactory, QuestionResult } from "./result";
import { ErrorMessage } from "./errors";
import { getLocalizedString } from "../../../common/localizeUtils";

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
  ): Promise<QuestionResult> {
    const res = await ctx.userInteraction?.showMessage(
      "warn",
      getLocalizedString("plugins.apiconnector.ExecuteUserTask.Message"),
      true,
      "OK"
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != "OK") {
      return err(UserCancelError);
    }
    return await this.apiConnectorImpl.generateQuestion(ctx);
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
