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
  TeamsBotInputs,
} from "./interface";

/**
 * teams bot - feature level action
 */
@Service("teams-bot")
export class TeamsBotFeature implements Resource {
  name = "teams-bot";
  add(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
    const actions: Action[] = [
      {
        name: "teams-bot.add",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          return ok(["add resource 'teams-bot' in projectSettings"]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          projectSettings.resources.push({
            name: "teams-bot",
            hostingResource: teamsBotInputs.hostingResource,
          });
          inputs.bicep = {};
          return ok(undefined);
        },
      },
      {
        name: "call:bot-scaffold.generateCode",
        type: "call",
        required: false,
        targetAction: "bot-scaffold.generateCode",
      },
      {
        name: `call:${teamsBotInputs.hostingResource}.generateBicep`,
        type: "call",
        required: false,
        targetAction: `${teamsBotInputs.hostingResource}.generateBicep`,
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "Bot" }],
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
