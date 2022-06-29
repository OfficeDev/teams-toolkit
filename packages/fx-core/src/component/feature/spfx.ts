// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  IStaticTab,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { CoreQuestionNames } from "../../core/question";
import { ComponentNames } from "../constants";
import { LoadProjectSettingsAction, WriteProjectSettingsAction } from "../projectSettingsManager";
@Service(ComponentNames.SPFx)
export class SPFxTab {
  name = ComponentNames.SPFx;
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    inputs.hosting = ComponentNames.SPFx;
    const actions: Action[] = [
      LoadProjectSettingsAction,
      {
        name: "fx.configTab",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          return ok(["config 'teams-tab' in projectSettings"]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          // add teams-tab
          projectSettings.components.push({
            name: "teams-tab",
            hosting: inputs.hosting,
          });
          // add hosting component
          projectSettings.components.push({
            name: inputs.hosting,
            provision: true,
          });
          projectSettings.programmingLanguage = inputs[CoreQuestionNames.ProgrammingLanguage];
          return ok(["config 'teams-tab' in projectSettings"]);
        },
      },
      {
        name: "call:tab-code.generate",
        type: "call",
        required: true,
        targetAction: "tab-code.generate",
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
      name: `${this.name}.add`,
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
}
