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
        name: "teams-bot.addResource",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          return ok([
            `add resources: 'teams-bot' in projectSettings: ${JSON.stringify(teamsBotInputs)}`,
          ]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          const projectSettings = context.projectSetting;
          const resourceConfig: ResourceConfig = {
            name: "teams-bot",
            ...teamsBotInputs,
          };
          projectSettings.resources.push(resourceConfig);
          console.log(
            `add resources: 'teams-bot' in projectSettings: ${JSON.stringify(resourceConfig)}`
          );
          return ok(undefined);
        },
      },
      {
        name: "call:bot-scaffold.generateCode",
        type: "call",
        required: false,
        targetAction: "bot-scaffold.generateCode",
        inputs: {
          "bot-scaffold": teamsBotInputs,
        },
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
