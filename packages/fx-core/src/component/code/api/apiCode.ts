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
import { CoreQuestionNames } from "../../../core/question";
import { FunctionScaffold } from "./scaffold";
import { ComponentNames, PathConstants, ProgrammingLanguage } from "../../constants";
import { BadComponent, invalidProjectSettings } from "../../error";
import { ErrorMessage, ProgressMessages, ProgressTitles } from "../../messages";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { getComponent } from "../../workflow";
import { LanguageStrategyFactory } from "./language-strategy";
import { execute } from "../utils";
import { ApiConstants } from "../constants";
import { QuestionKey } from "./enums";
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
      errorSource: "api",
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
    const folder = inputs.folder || PathConstants.apiWorkingDir;
    const workingDir = path.join(inputs.projectPath, folder);
    const functionName = inputs[QuestionKey.functionName];
    const variables = {
      appName: appName!,
      functionName: functionName,
    };
    await actionContext?.progressBar?.next(ProgressMessages.scaffoldApi);
    await FunctionScaffold.scaffoldFunction(
      workingDir,
      language,
      ApiConstants.functionTriggerType,
      functionName,
      variables,
      context.logProvider
    );
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingApi,
      progressSteps: 1,
    }),
  ])
  async build(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const teamsApi = getComponent(context.projectSetting, ComponentNames.TeamsApi);
    if (!teamsApi) return ok(undefined);
    if (teamsApi.folder == undefined) throw new BadComponent("api", this.name, "folder");
    const language = context.projectSetting.programmingLanguage;
    if (!language || !Object.values(ProgrammingLanguage).includes(language as ProgrammingLanguage))
      throw new invalidProjectSettings(ErrorMessage.programmingLanguageInvalid);
    const buildPath = path.resolve(inputs.projectPath, teamsApi.folder);

    await actionContext?.progressBar?.next(ProgressMessages.buildingApi);
    for (const commandItem of LanguageStrategyFactory.getStrategy(language as ProgrammingLanguage)
      .buildCommands) {
      const command: string = commandItem.command;
      const relativePath: string = commandItem.relativePath;
      const absolutePath: string = path.join(buildPath, relativePath);
      await execute(command, absolutePath, context.logProvider);
    }
    return ok(undefined);
  }
}
