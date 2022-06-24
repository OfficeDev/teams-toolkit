// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import {
  err,
  Func,
  FxError,
  Inputs,
  Json,
  M365TokenProvider,
  NotImplementedError,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { addFeature, getQuestionsForAddFeature } from "./addFeature";
import { BuiltInSolutionNames } from "./constants";
import { deploy, getQuestionsForDeploy } from "./deploy";
import { getQuestionsForProvision, provisionResources } from "./provision";
import { getQuestionsForPublish, publishApplication } from "./publish";
import { addCapability, addResource, getQuestionsForUserTask } from "./userTask";

@Service(BuiltInSolutionNames.azure)
export class TeamsFxAzureSolution implements v3.ISolution {
  name = BuiltInSolutionNames.azure;

  getQuestionsForAddFeature = getQuestionsForAddFeature;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async addFeature(
    ctx: v2.Context,
    inputs: v3.SolutionAddFeatureInputs,
    telemetryProps?: Json
  ): Promise<Result<Void, FxError>> {
    return addFeature(ctx, inputs, telemetryProps);
  }

  getQuestionsForProvision = getQuestionsForProvision;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async provisionResources(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider,
    telemetryProps?: Json
  ): Promise<Result<v3.EnvInfoV3, FxError>> {
    return provisionResources(ctx, inputs, envInfo, tokenProvider, telemetryProps);
  }

  getQuestionsForDeploy = getQuestionsForDeploy;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider,
    telemetryProps?: Json
  ): Promise<Result<Void, FxError>> {
    return deploy(ctx, inputs, envInfo, tokenProvider, telemetryProps);
  }

  getQuestionsForPublish = getQuestionsForPublish;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async publishApplication(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: M365TokenProvider,
    telemetryProps?: Json
  ): Promise<Result<Void, FxError>> {
    return publishApplication(ctx, inputs, envInfo, tokenProvider, telemetryProps);
  }

  getQuestionsForUserTask = getQuestionsForUserTask;
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async executeUserTask(
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider,
    telemetryProps?: Json
  ): Promise<Result<unknown, FxError>> {
    const method = func.method;
    if (method === "addCapability") {
      return this.addCapability(ctx, inputs, telemetryProps);
    }
    if (method === "addResource") {
      return this.addResource(ctx, inputs, telemetryProps);
    }
    return err(new NotImplementedError("Solution", "executeUserTask"));
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async addCapability(
    ctx: v2.Context,
    inputs: Inputs,
    telemetryProps?: Json
  ): Promise<Result<Void, FxError>> {
    return addCapability(ctx, inputs, telemetryProps);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInSolutionNames.azure } })])
  async addResource(
    ctx: v2.Context,
    inputs: Inputs,
    telemetryProps?: Json
  ): Promise<Result<Void, FxError>> {
    return addResource(ctx, inputs, telemetryProps);
  }
}
