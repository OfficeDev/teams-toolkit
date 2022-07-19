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
import { isVSProject } from "../../common/projectSettingsHelper";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import {
  frameworkQuestion,
  versionCheckQuestion,
  webpartNameQuestion,
} from "../../plugins/resource/spfx/utils/questions";
import { ComponentNames } from "../constants";
@Service(ComponentNames.SPFxTab)
export class SPFxTab {
  name = ComponentNames.SPFxTab;
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    inputs.hosting = ComponentNames.SPFx;
    const actions: Action[] = [
      {
        name: "fx.configTab",
        type: "function",
        question: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const spfx_frontend_host = new QTreeNode({
            type: "group",
          });
          const spfx_version_check = new QTreeNode(versionCheckQuestion);
          spfx_frontend_host.addChild(spfx_version_check);
          const spfx_framework_type = new QTreeNode(frameworkQuestion);
          spfx_version_check.addChild(spfx_framework_type);
          const spfx_webpart_name = new QTreeNode(webpartNameQuestion);
          spfx_version_check.addChild(spfx_webpart_name);
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
            deploy: true,
          });
          // add hosting component
          projectSettings.components.push({
            name: inputs.hosting,
            provision: true,
          });
          projectSettings.programmingLanguage =
            projectSettings.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage];
          globalVars.isVS = isVSProject(projectSettings);
          return ok(["config 'teams-tab' in projectSettings"]);
        },
      },
      {
        name: "call:spfx-tab-code.generate",
        type: "call",
        required: true,
        targetAction: "spfx-tab-code.generate",
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
}
