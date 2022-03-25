// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import bot from "../../plugins/resource/bot";
import { ensureSolutionSettings } from "../../plugins/solution/fx-solution/utils/solutionSettingsHelper";
import {
  Action,
  AddInstanceAction,
  ResourcePlugin,
  GroupAction,
  MaybePromise,
  CallAction,
  TeamsBotInputs,
  ProjectConfig,
} from "./interface";

/**
 * teams bot - feature level action
 */
@Service("teams-bot")
export class TeamsBotFeature implements ResourcePlugin {
  name = "teams-bot";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const botInputs = inputs as TeamsBotInputs;
    const addInstance: AddInstanceAction = {
      name: "teams-bot.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([
          "add 'bot' entry in projectSettings",
          `ensure entry '${botInputs.hostingResource}', 'azure-bot' in projectSettings.solutionSettings.activeResourcePlugins`,
        ]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        ensureSolutionSettings(context.projectSetting);
        const projectConfig = context.projectSetting as ProjectConfig;
        projectConfig.bot = {
          language: botInputs.language,
          hostingResource: botInputs.hostingResource,
        };
        if (
          !context.projectSetting.solutionSettings?.activeResourcePlugins.includes(
            botInputs.hostingResource
          )
        )
          context.projectSetting.solutionSettings?.activeResourcePlugins.push(
            botInputs.hostingResource
          );
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes("azure-bot"))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push("azure-bot");
        console.log(
          `ensure entry '${botInputs.hostingResource}', 'azure-bot' in projectSettings.solutionSettings.activeResourcePlugins`
        );
        return ok(undefined);
      },
    };
    const group: GroupAction = {
      type: "group",
      name: "teams-bot.addInstance",
      actions: [
        addInstance,
        {
          type: "call",
          required: true,
          targetAction: "teams-manifest.addCapability",
          inputs: {
            capabilities: ["Bot"],
          },
        },
      ],
    };
    return ok(group);
  }
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: CallAction = {
      name: "nodejs-bot.generateCode",
      type: "call",
      required: true,
      targetAction: "bot-scaffold.generateCode",
    };
    return ok(action);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok({
      type: "call",
      required: true,
      targetAction: `${inputs.hostingResource}.generateBicep`,
    });
  }
  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok({
      type: "call",
      targetAction: "bot-scaffold.build",
      required: true,
    });
  }
  deploy(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const botConfig = (context.projectSetting as any).bot;
    const hostResource = botConfig.hostingResource;
    const action: GroupAction = {
      type: "group",
      name: "teams-bot.deploy",
      actions: [
        {
          type: "call",
          targetAction: "teams-bot.build",
          required: false,
        },
        {
          type: "call",
          targetAction: `${hostResource}.deploy`,
          required: false,
          inputs: {
            path: "bot",
            type: "folder",
          },
        },
      ],
    };
    return ok(action);
  }
}
