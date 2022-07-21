// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  Inputs,
  InputsWithProjectPath,
  IProgressHandler,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  QTreeNode,
  Result,
  SourceCodeProvider,
  Stage,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { getComponent } from "../workflow";
import {
  DefaultValues,
  FunctionPluginPathInfo,
  RegularExpr,
} from "../../plugins/resource/function/constants";
import { FunctionScaffold } from "../../plugins/resource/function/ops/scaffold";
import { FunctionLanguage, QuestionKey } from "../../plugins/resource/function/enums";
import { ComponentNames } from "../constants";
import { FunctionDeploy } from "../../plugins/resource/function/ops/deploy";
import { merge } from "lodash";
import { Plans, ProgressMessages, ProgressTitles } from "../messages";
import { functionNameQuestion } from "../../plugins/resource/function/question";
import { ErrorMessages } from "../../plugins/resource/function/resources/message";
import { CoreQuestionNames } from "../../core/question";
/**
 * api scaffold
 */
@Service("api-code")
export class ApiCodeProvider implements SourceCodeProvider {
  name = "api-code";
  generate(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "api-code.generate",
      type: "function",
      enableProgressBar: true,
      progressTitle: ProgressTitles.scaffoldApi,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-function",
      telemetryEventName: "scaffold",
      errorSource: "BE",
      errorIssueLink: DefaultValues.issueLink,
      errorHelpLink: DefaultValues.helpLink,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const folder = inputs.folder || FunctionPluginPathInfo.solutionFolderName;
        return ok([Plans.scaffold("api", path.join(inputs.projectPath, folder))]);
      },
      execute: async (
        ctx: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const projectSettings = ctx.projectSetting as ProjectSettingsV3;
        const appName = projectSettings.appName;
        const language = inputs[CoreQuestionNames.ProgrammingLanguage];
        const folder = inputs.folder || FunctionPluginPathInfo.solutionFolderName;
        const workingDir = path.join(inputs.projectPath, folder);
        const functionName = inputs[QuestionKey.functionName];
        const variables = {
          appName: appName,
          functionName: functionName,
        };
        progress?.next(ProgressMessages.scaffoldApi);
        await FunctionScaffold.scaffoldFunction(
          workingDir,
          language,
          DefaultValues.functionTriggerType,
          functionName,
          variables
        );
        return ok([Plans.scaffold("api", workingDir)]);
      },
    };
    return ok(action);
  }
  build(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "api-code.build",
      type: "function",
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingApi,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-function",
      telemetryEventName: "build",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsApi = getComponent(context.projectSetting, ComponentNames.TeamsApi);
        if (!teamsApi) return ok([]);
        const apiDir = teamsApi?.folder;
        if (!apiDir) return ok([]);
        return ok([Plans.buildProject(apiDir)]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const teamsApi = getComponent(context.projectSetting, ComponentNames.TeamsApi);
        if (!teamsApi) return ok([]);
        if (teamsApi.folder == undefined) throw new Error("path not found");
        const language = context.projectSetting.programmingLanguage;
        if (!language || !Object.values(FunctionLanguage).includes(language as FunctionLanguage))
          throw new Error("Invalid programming language found in project settings.");
        progress?.next(ProgressMessages.buildingApi);
        const buildPath = path.resolve(inputs.projectPath, teamsApi.folder);
        await FunctionDeploy.build(buildPath, language as FunctionLanguage);
        const artifactFolder = teamsApi.artifactFolder || teamsApi.folder;
        merge(teamsApi, { build: true, artifactFolder: path.join(artifactFolder) });
        return ok([Plans.buildProject(buildPath)]);
      },
    };
    return ok(action);
  }
}

const getFunctionNameQuestionValidation = (context: ContextV3, inputs: InputsWithProjectPath) => ({
  validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
    const workingPath: string = path.join(
      inputs.projectPath,
      FunctionPluginPathInfo.solutionFolderName
    );
    const name = input as string;
    if (!name || !RegularExpr.validFunctionNamePattern.test(name)) {
      return ErrorMessages.invalidFunctionName;
    }
    if (inputs.stage === Stage.create) {
      return undefined;
    }
    const language: FunctionLanguage =
      (inputs[QuestionKey.programmingLanguage] as FunctionLanguage) ??
      (context.projectSetting.programmingLanguage as FunctionLanguage);
    // If language is unknown, skip checking and let scaffold handle the error.
    if (language && (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))) {
      return ErrorMessages.functionAlreadyExists;
    }
  },
});
