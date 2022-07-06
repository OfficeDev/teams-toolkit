// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  ProvisionContextV3,
  Result,
  SourceCodeProvider,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { getComponent } from "../workflow";
import { DefaultValues, FunctionPluginPathInfo } from "../../plugins/resource/function/constants";
import { FunctionScaffold } from "../../plugins/resource/function/ops/scaffold";
import { QuestionKey } from "../../plugins/resource/function/enums";
import { ComponentNames } from "../constants";
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
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const folder = inputs.folder || FunctionPluginPathInfo.solutionFolderName;
        return ok([`scaffold api source code in folder: ${path.join(inputs.projectPath, folder)}`]);
      },
      execute: async (ctx: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = ctx.projectSetting as ProjectSettingsV3;
        const appName = projectSettings.appName;
        const language =
          inputs?.["programming-language"] ||
          context.projectSetting.programmingLanguage ||
          "javascript";
        const folder = inputs.folder || FunctionPluginPathInfo.solutionFolderName;
        const workingDir = path.join(inputs.projectPath, folder);
        const functionName =
          (inputs?.[QuestionKey.functionName] as string) ?? DefaultValues.functionName;
        const variables = {
          appName: appName,
          functionName: functionName,
        };
        await FunctionScaffold.scaffoldFunction(
          workingDir,
          language,
          DefaultValues.functionTriggerType,
          functionName,
          variables
        );
        return ok([`scaffold api source code in folder: ${workingDir}`]);
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
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsApi = getComponent(context.projectSetting, ComponentNames.TeamsApi);
        if (!teamsApi) return ok([]);
        const apiDir = teamsApi?.folder;
        if (!apiDir) return ok([]);
        return ok([`build project: ${apiDir}`]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        return ok([`build project`]);
      },
    };
    return ok(action);
  }
}
