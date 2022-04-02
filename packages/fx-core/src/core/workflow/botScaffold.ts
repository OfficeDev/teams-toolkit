// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  ResourceConfig,
  ScaffoldResource,
  TeamsBotInputs,
} from "./interface";

/**
 * bot scaffold plugin
 */
@Service("bot-scaffold")
export class BotScaffoldResource implements ScaffoldResource {
  readonly type = "scaffold";
  name = "bot-scaffold";
  generateCode(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-scaffold.generateCode",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        const language = teamsBotInputs.language || context.projectSetting.programmingLanguage;
        const scenarios = teamsBotInputs.scenarios;
        const folder = teamsBotInputs.folder || "bot";
        return ok([
          "add resource 'bot-scaffold' in projectSettings",
          `scaffold bot source code for language: ${language}, scenario: ${scenarios}, hostingResource: ${teamsBotInputs.hostingResource}, folder: ${folder}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        const language = (teamsBotInputs.language || context.projectSetting.programmingLanguage) as
          | "csharp"
          | "javascript"
          | "typescript";
        const folder = teamsBotInputs.folder || "bot";
        const resourceConfig: ResourceConfig = {
          name: "bot-scaffold",
          build: true,
          deployType: "zip",
          folder: folder,
          language: language,
          scenarios: teamsBotInputs.scenarios,
          hostingResource: teamsBotInputs.hostingResource,
        };
        projectSettings.resources.push(resourceConfig);
        console.log("add resource 'bot-scaffold' in projectSettings");
        console.log(`scaffold bot source code: ${JSON.stringify(resourceConfig)}`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const language = context.projectSetting.programmingLanguage;
    if (language === "typescript") {
      const group: GroupAction = {
        type: "group",
        name: "bot-scaffold.build",
        actions: [
          {
            type: "shell",
            command: "npm install",
            description: `npm install (${path.resolve(inputs.projectPath, "bot")})`,
            cwd: path.resolve(inputs.projectPath, "bot"),
          },
          {
            type: "shell",
            command: "npm run build",
            description: `npm run build (${path.resolve(inputs.projectPath, "bot")})`,
            cwd: path.resolve(inputs.projectPath, "bot"),
          },
        ],
      };
      return ok(group);
    } else if (language === "csharp") {
      return ok({
        type: "shell",
        name: "bot-scaffold.build",
        command: "MsBuild",
        description: `MsBuild (${path.resolve(inputs.projectPath, "bot")})`,
        cwd: path.resolve(inputs.projectPath, "bot"),
      });
    } else return ok(undefined);
  }
}
