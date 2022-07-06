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
import { ComponentNames } from "../constants";
import { LoadProjectSettingsAction, WriteProjectSettingsAction } from "../projectSettingsManager";
@Service("teams-tab")
export class TeamsTab {
  name = "teams-tab";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    inputs.hosting =
      inputs.hosting ||
      (inputs?.["programming-language"] === "csharp"
        ? ComponentNames.AzureWebApp
        : ComponentNames.AzureStorage);
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
            connections: ["teams-tab"],
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
        inputs: {
          componentId: this.name,
          componentName: "Tab",
        },
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
      // TODO: connect AAD for blazor web app
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
      name: "teams-tab.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: CallAction = {
      name: "teams-tab.configure",
      type: "call",
      targetAction: "tab-code.configure",
      required: true,
    };
    return ok(action);
  }
  build(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: CallAction = {
      name: "teams-tab.build",
      type: "call",
      targetAction: "tab-code.build",
      required: true,
    };
    return ok(action);
  }
}
