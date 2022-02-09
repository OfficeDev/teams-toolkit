// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  err,
  Func,
  FxError,
  Inputs,
  NotImplementedError,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { addFeature, getQuestionsForAddFeature } from "./addFeature";
import { BuiltInSolutionNames, TeamsFxAzureSolutionNameV3 } from "./constants";
import { deploy, getQuestionsForDeploy } from "./deploy";
import { getQuestionsForProvision, provisionResources } from "./provision";
import { getQuestionsForPublish, publishApplication } from "./publish";
import { addCapability, addResource, getQuestionsForUserTask } from "./userTask";

@Service(TeamsFxAzureSolutionNameV3)
export class TeamsFxAzureSolution implements v3.ISolution {
  name = TeamsFxAzureSolutionNameV3;

  getQuestionsForAddFeature = getQuestionsForAddFeature;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  addFeature = addFeature;

  getQuestionsForProvision = getQuestionsForProvision;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  provisionResources = provisionResources;

  getQuestionsForDeploy = getQuestionsForDeploy;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  deploy = deploy;

  getQuestionsForPublish = getQuestionsForPublish;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  publishApplication = publishApplication;

  getQuestionsForUserTask = getQuestionsForUserTask;
  async executeUserTask(
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<unknown, FxError>> {
    const method = func.method;
    if (method === "addCapability") {
      return this.addCapability(ctx, inputs);
    }
    if (method === "addResource") {
      return this.addResource(ctx, inputs);
    }
    return err(new NotImplementedError("Solution", "executeUserTask"));
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  addCapability = addCapability;

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  addResource = addResource;
}
