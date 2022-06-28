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
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import { getComponent } from "../workflow";

@Service("apim")
export class ApimFeature {
  name = "apim";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        name: "apim.configApim",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const component = getComponent(context.projectSetting, "apim");
          if (component) {
            return ok([]);
          }
          const remarks: string[] = ["add component 'azure-sql' in projectSettings"];
          context.projectSetting.components.push({
            name: this.name,
            provision: true,
            deploy: true,
          });
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const component = getComponent(context.projectSetting, "apim");
          if (component) {
            return ok([]);
          }
          const remarks: string[] = ["add component 'azure-sql' in projectSettings"];
          context.projectSetting.components.push({
            name: this.name,
            provision: true,
            deploy: true,
          });
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      {
        name: "call:apim.generateBicep",
        type: "call",
        required: true,
        targetAction: "apim.generateBicep",
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "apim.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
}
