// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AddInstanceAction,
  GroupAction,
  MaybePromise,
  ResourcePlugin,
  TeamsTabInputs,
} from "./interface";

/**
 * tab scaffold plugin
 */
@Service("tab-scaffold")
export class TabScaffoldResource implements ResourcePlugin {
  name = "tab-scaffold";
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: AddInstanceAction = {
      name: "tab-scaffold.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        const tabInputs = inputs as TeamsTabInputs;
        return ok([
          `scaffold tab source code for language: ${tabInputs.language}, framework: ${tabInputs.framework}, hostingResource: ${tabInputs.hostingResource}`,
        ]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const tabInputs = inputs as TeamsTabInputs;
        console.log(
          `scaffold tab source code for language: ${tabInputs.language}, framework: ${tabInputs.framework}, hostingResource: ${tabInputs.hostingResource}`
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
    const config = (context.projectSetting as any).tab;
    const language = config.language;
    if (language === "typescript") {
      const group: GroupAction = {
        type: "group",
        name: "tab-scaffold.build",
        actions: [
          {
            type: "shell",
            command: "npm install",
            description: "npm install",
            cwd: path.resolve(inputs.projectPath, "tab"),
          },
          {
            type: "shell",
            command: "npm run build",
            description: "npm run build",
            cwd: path.resolve(inputs.projectPath, "tab"),
          },
        ],
      };
      return ok(group);
    } else if (language === "csharp") {
      return ok({
        type: "shell",
        name: "tab-scaffold.build",
        command: "MsBuild",
        description: "MsBuild for tab",
        cwd: path.resolve(inputs.projectPath, "tab"),
      });
    } else return ok(undefined);
  }
}
