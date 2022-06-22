// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
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
import { isVSProject } from "../../common";
import { CoreQuestionNames } from "../../core/question";
import { ComponentNames } from "../constants";
@Service("teams-tab")
export class TeamsfxCore {
  name = "teams-tab";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    inputs.hosting =
      inputs.hosting || isVSProject(context.projectSetting)
        ? ComponentNames.AzureWebApp
        : ComponentNames.AzureStorage;
    const actions: Action[] = [
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
        name: `call:${inputs.hosting}.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}.generateBicep`,
      },
      {
        name: "call:app-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "app-manifest.addCapability",
        inputs: {
          capabilities: [{ name: "staticTab" }, { name: "configurableTab" }],
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "teams-tab.add",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }
}
