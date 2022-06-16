// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Component,
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
@Service("teams-tab")
export class TeamsfxCore {
  name = "teams-tab";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    // const actions: Action[] = [
    //   {
    //     name: "fx.configTab",
    //     type: "function",
    //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
    //       return ok([`add component 'teams-tab' in projectSettings: ${JSON.stringify(inputs)}`]);
    //     },
    //     execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    //       const projectSettings = context.projectSetting as ProjectSettingsV3;
    //       const teamsTabResource: Component = {
    //         name: "teams-tab",
    //         ...inputs,
    //       };
    //       projectSettings.components.push(teamsTabResource);
    //       console.log(
    //         `add component 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabResource)}`
    //       );
    //       return ok([]);
    //     },
    //   },
    //   {
    //     name: "call:tab-code.generate",
    //     type: "call",
    //     required: true,
    //     targetAction: "tab-code.generate",
    //   },
    //   {
    //     type: "call",
    //     targetAction: "bicep.init",
    //     required: true,
    //   },
    //   {
    //     name: `call:${inputs.hosting}.generateBicep`,
    //     type: "call",
    //     required: true,
    //     targetAction: `${inputs.hosting}.generateBicep`,
    //   },
    //   {
    //     name: "call:app-manifest.addCapability",
    //     type: "call",
    //     required: true,
    //     targetAction: "app-manifest.addCapability",
    //     inputs: {
    //       "app-manifest": {
    //         capabilities: [{ name: "staticTab" }],
    //       },
    //     },
    //   },
    // ];
    // const group: GroupAction = {
    //   type: "group",
    //   name: "teams-tab.add",
    //   mode: "parallel",
    //   actions: actions,
    // };
    // return ok(group);
    return ok(undefined);
  }
}
