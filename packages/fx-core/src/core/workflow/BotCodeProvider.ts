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
  Component,
  SourceCodeProvider,
  TeamsBotInputs,
} from "./interface";

/**
 * bot scaffold plugin
 */
@Service("bot-code")
export class BotCodeProvider implements SourceCodeProvider {
  readonly type = "code";
  name = "bot-code";
  generate(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-code.generate",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        const component: Component = {
          name: "bot-code",
          ...teamsBotInputs,
          build: true,
          language: teamsBotInputs.language || context.projectSetting.programmingLanguage,
          folder: teamsBotInputs.folder || "bot",
        };
        return ok([
          "add component 'bot-code' in projectSettings",
          `scaffold bot source code: ${JSON.stringify(component)}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        const component: Component = {
          name: "bot-code",
          ...teamsBotInputs,
          build: true,
          language: teamsBotInputs.language || context.projectSetting.programmingLanguage,
          folder: teamsBotInputs.folder || "bot",
        };
        projectSettings.components.push(component);
        console.log("add component 'bot-code' in projectSettings");
        console.log(`scaffold bot source code: ${JSON.stringify(component)}`);
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
        name: "bot-code.build",
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
        name: "bot-code.build",
        command: "MsBuild",
        description: `MsBuild (${path.resolve(inputs.projectPath, "bot")})`,
        cwd: path.resolve(inputs.projectPath, "bot"),
      });
    } else return ok(undefined);
  }
}
