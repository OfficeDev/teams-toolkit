// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
  GroupAction,
  Inputs,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  QTreeNode,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import "reflect-metadata";
import { Service } from "typedi";
import { CoreQuestionNames } from "../../core/question";
import {
  DefaultValues,
  FunctionPluginPathInfo,
  RegularExpr,
} from "../../plugins/resource/function/constants";
import { FunctionLanguage, QuestionKey } from "../../plugins/resource/function/enums";
import { FunctionScaffold } from "../../plugins/resource/function/ops/scaffold";
import { functionNameQuestion } from "../../plugins/resource/function/question";
import { ErrorMessages } from "../../plugins/resource/function/resources/message";
import { ComponentNames } from "../constants";
import { getComponent } from "../workflow";
import * as path from "path";
@Service(ComponentNames.TeamsApi)
export class TeamsApi {
  name = ComponentNames.TeamsApi;
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    inputs.hosting = inputs.hosting || ComponentNames.Function;
    const functionName: string =
      (inputs?.[QuestionKey.functionName] as string) ?? DefaultValues.functionName;
    const actions: Action[] = [
      {
        name: "fx.configApi",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          return ok([`config '${this.name}' in projectSettings`]);
        },
        question: (context: ContextV3, inputs: InputsWithProjectPath) => {
          functionNameQuestion.validation = {
            validFunc: async (
              input: string,
              previousInputs?: Inputs
            ): Promise<string | undefined> => {
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
              if (
                language &&
                (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))
              ) {
                return ErrorMessages.functionAlreadyExists;
              }
            },
          };
          return ok(new QTreeNode(functionNameQuestion));
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          // add teams-api
          projectSettings.components.push({
            name: this.name,
            hosting: inputs.hosting,
            functionNames: [functionName],
          });
          // add hosting component
          projectSettings.components.push({
            name: inputs.hosting,
            connections: [this.name],
          });
          const teamsTab = getComponent(projectSettings, ComponentNames.TeamsTab);
          if (!teamsTab?.connections) merge(teamsTab, { connections: [this.name] });
          else teamsTab.connections.push(this.name);
          projectSettings.programmingLanguage ??= inputs[CoreQuestionNames.ProgrammingLanguage];
          return ok([`config '${this.name}' in projectSettings`]);
        },
      },
      {
        name: "call:api-code.generate",
        type: "call",
        required: true,
        targetAction: "api-code.generate",
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      {
        name: `call:${inputs.hosting}.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}.generateBicep`,
        inputs: {
          componentId: this.name,
          componentName: "Api",
        },
      },
      {
        name: `call:${inputs.hosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}-config.generateBicep`,
        inputs: {
          componentId: this.name,
          componentName: "Api",
        },
      },
      {
        name: "call:debug.generateLocalDebugSettings",
        type: "call",
        required: true,
        targetAction: "debug.generateLocalDebugSettings",
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: `${this.name}.add`,
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
  build(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: CallAction = {
      name: `${this.name}.build`,
      type: "call",
      targetAction: "api-code.build",
      required: true,
    };
    return ok(action);
  }
}
