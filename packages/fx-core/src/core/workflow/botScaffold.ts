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
  ScaffoldResource,
  TeamsBotInputs,
} from "./interface";
import * as path from "path";
import { getResource } from "./workflow";

/**
 * bot scaffold plugin
 */
@Service("bot-scaffold")
export class BotScaffoldResource implements ScaffoldResource {
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
        return ok([
          "ensure resource 'bot-scaffold' in projectSettings",
          `scaffold bot source code for language: ${inputs["programming-language"]}, scenario: ${teamsBotInputs.scenarios}, hostingResource: ${teamsBotInputs.hostingResource}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        projectSettings.resources.push({
          name: "bot-scaffold",
          type: "scaffold",
          hostingResource: teamsBotInputs.hostingResource,
        });
        console.log("add resource 'bot-scaffold' in projectSettings");
        console.log(
          `scaffold bot source code for language: ${inputs["programming-language"]}, scenario: ${teamsBotInputs.scenarios}, hostingResource: ${teamsBotInputs.hostingResource}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const config = (context.projectSetting as any).bot;
    const language = context.projectSetting.programmingLanguage;
    if (language === "typescript") {
      const group: GroupAction = {
        type: "group",
        name: "bot-scaffold.build",
        actions: [
          {
            type: "shell",
            command: "npm install",
            description: "npm install",
            cwd: path.resolve(inputs.projectPath, "bot"),
          },
          {
            type: "shell",
            command: "npm run build",
            description: "npm run build",
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
        description: "MsBuild for bot",
        cwd: path.resolve(inputs.projectPath, "bot"),
      });
    } else return ok(undefined);
  }
}
