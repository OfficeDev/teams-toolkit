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
  QTreeNode,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { CoreQuestionNames } from "../../core/question";
import {
  frameworkQuestion,
  webpartDescriptionQuestion,
  webpartNameQuestion,
} from "../../plugins/resource/spfx/utils/questions";
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
        question: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const spfx_frontend_host = new QTreeNode({
            type: "group",
          });
          const spfx_framework_type = new QTreeNode(frameworkQuestion);
          spfx_frontend_host.addChild(spfx_framework_type);
          const spfx_webpart_name = new QTreeNode(webpartNameQuestion);
          spfx_frontend_host.addChild(spfx_webpart_name);
          const spfx_webpart_desp = new QTreeNode(webpartDescriptionQuestion);
          spfx_frontend_host.addChild(spfx_webpart_desp);
          return ok(spfx_frontend_host);
        },
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
