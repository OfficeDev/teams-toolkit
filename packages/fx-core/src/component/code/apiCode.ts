// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  ok,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { CoreQuestionNames } from "../../core/question";
import { DefaultValues, FunctionPluginPathInfo } from "../../plugins/resource/function/constants";
import { FunctionLanguage, QuestionKey } from "../../plugins/resource/function/enums";
import { FunctionDeploy } from "../../plugins/resource/function/ops/deploy";
import { FunctionScaffold } from "../../plugins/resource/function/ops/scaffold";
import { ComponentNames } from "../constants";
import { ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { getComponent } from "../workflow";
/**
 * api scaffold
 */
@Service("api-code")
export class ApiCodeProvider {
  name = "api-code";
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.scaffoldApi,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-function",
      telemetryEventName: "scaffold",
      errorSource: "BE",
      errorIssueLink: DefaultValues.issueLink,
      errorHelpLink: DefaultValues.helpLink,
    }),
  ])
  async generate(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const appName = projectSettings.appName;
    const language = inputs[CoreQuestionNames.ProgrammingLanguage];
    const folder = inputs.folder || FunctionPluginPathInfo.solutionFolderName;
    const workingDir = path.join(inputs.projectPath, folder);
    const functionName = inputs[QuestionKey.functionName];
    const variables = {
      appName: appName,
      functionName: functionName,
    };
    actionContext?.progressBar?.next(ProgressMessages.scaffoldApi);
    await FunctionScaffold.scaffoldFunction(
      workingDir,
      language,
      DefaultValues.functionTriggerType,
      functionName,
      variables
    );
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingApi,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-function",
      telemetryEventName: "build",
    }),
  ])
  async build(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const teamsApi = getComponent(context.projectSetting, ComponentNames.TeamsApi);
    if (!teamsApi) return ok(undefined);
    if (teamsApi.folder == undefined) throw new Error("path not found");
    const language = context.projectSetting.programmingLanguage;
    if (!language || !Object.values(FunctionLanguage).includes(language as FunctionLanguage))
      throw new Error("Invalid programming language found in project settings.");
    actionContext?.progressBar?.next(ProgressMessages.buildingApi);
    const buildPath = path.resolve(inputs.projectPath, teamsApi.folder);
    await FunctionDeploy.build(buildPath, language as FunctionLanguage);
    return ok(undefined);
  }
}
