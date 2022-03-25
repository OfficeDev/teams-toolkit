// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AddInstanceAction,
  GroupAction,
  MaybePromise,
  ResourcePlugin,
  TeamsBotInputs,
} from "./interface";
import * as path from "path";

/**
 * bot scaffold plugin
 */
@Service("bot-scaffold")
export class BotScaffoldResource implements ResourcePlugin {
  name = "bot-scaffold";
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const botInputs = inputs as TeamsBotInputs;
    const action: AddInstanceAction = {
      name: "bot-scaffold.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([
          `scaffold bot source code for language: ${botInputs.language}, scenario: ${botInputs.scenario}, hostingResource: ${botInputs.hostingResource}`,
        ]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `scaffold bot source code for language: ${botInputs.language}, scenario: ${botInputs.scenario}, hostingResource: ${botInputs.hostingResource}`
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
    const language = config.language;
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
