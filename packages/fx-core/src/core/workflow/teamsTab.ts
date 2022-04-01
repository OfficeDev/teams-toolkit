// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  Resource,
  ResourceConfig,
  TeamsTabInputs,
} from "./interface";

/**
 * teams tab - feature level action
 */
@Service("teams-tab")
export class TeamsTabFeature implements Resource {
  name = "teams-tab";
  add(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
    const actions: Action[] = [
      {
        name: "teams-tab.add",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const addInput = (inputs as TeamsTabInputs)["teams-tab"];
          return ok([`add resources: 'teams-tab' in projectSettings: ${addInput}`]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTabResource: ResourceConfig = {
            name: "teams-tab",
            hostingResource: teamsTabInputs.hostingResource,
          };
          projectSettings.resources.push(teamsTabResource);
          inputs.bicep = {};
          return ok(undefined);
        },
      },
      {
        name: "call:tab-scaffold.generateCode",
        type: "call",
        required: false,
        targetAction: "tab-scaffold.generateCode",
      },
      {
        name: `call:${teamsTabInputs.hostingResource}.generateBicep`,
        type: "call",
        required: false,
        targetAction: `${teamsTabInputs.hostingResource}.generateBicep`,
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "staticTab" }],
          },
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
