// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { CoreQuestionNames } from "../../core/question";
import { DefaultValues } from "../../plugins/resource/function/constants";
import { QuestionKey } from "../../plugins/resource/function/enums";
import { ComponentNames } from "../constants";
import { LoadProjectSettingsAction, WriteProjectSettingsAction } from "../projectSettingsManager";
@Service("teams-api")
export class TeamsApi {
  name = "teams-api";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    inputs.hosting = inputs.hosting || ComponentNames.Function;
    const functionName: string =
      (inputs?.[QuestionKey.functionName] as string) ?? DefaultValues.functionName;
    const actions: Action[] = [
      LoadProjectSettingsAction,
      {
        name: "fx.configApi",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          return ok(["config 'teams-api' in projectSettings"]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          // add teams-api
          projectSettings.components.push({
            name: "teams-api",
            hosting: inputs.hosting,
            functionNames: [functionName],
          });
          // add hosting component
          projectSettings.components.push({
            name: inputs.hosting,
            connections: ["teams-api"],
            provision: true,
          });
          projectSettings.programmingLanguage ??= inputs[CoreQuestionNames.ProgrammingLanguage];
          return ok(["config 'teams-api' in projectSettings"]);
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
          componentName: "api",
        },
      },
      {
        name: "call:debug.generateLocalDebugSettings",
        type: "call",
        required: true,
        targetAction: "debug.generateLocalDebugSettings",
      },
      WriteProjectSettingsAction,
    ];
    const group: GroupAction = {
      type: "group",
      name: "teams-api.add",
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
      name: "teams-api.build",
      type: "call",
      targetAction: "api-code.build",
      required: true,
    };
    return ok(action);
  }
}
