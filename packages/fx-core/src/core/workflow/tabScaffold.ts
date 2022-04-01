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
  ScaffoldResource,
  TeamsTabInputs,
} from "./interface";

/**
 * tab scaffold plugin
 */
@Service("tab-scaffold")
export class TabScaffoldResource implements ScaffoldResource {
  name = "tab-scaffold";
  generateCode(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "tab-scaffold.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        const tabInputs = (inputs as TeamsTabInputs)["teams-tab"];
        return ok([
          "add resource 'tab-scaffold' in projectSettings",
          `scaffold tab source code for language: ${inputs["programming-language"]}, scenario: ${tabInputs.framework}, hostingResource: ${tabInputs.hostingResource}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const tabInputs = (inputs as TeamsTabInputs)["teams-tab"];
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        console.log("add resource 'tab-scaffold' in projectSettings");
        console.log(
          `scaffold tab source code for language: ${inputs["programming-language"]}, framework: ${tabInputs.framework}, hostingResource: ${tabInputs.hostingResource}`
        );
        const folder = tabInputs.hostingResource === "spfx" ? "spfx" : "tab";
        projectSettings.resources.push({
          name: "tab-scaffold",
          build: true,
          deployType: "zip",
          folder: folder,
          hostingResource: tabInputs.hostingResource,
        });
        return ok(undefined);
      },
    };
    return ok(action);
  }
  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const language = projectSettings.programmingLanguage;
    if (language === "typescript") {
      const group: GroupAction = {
        type: "group",
        name: "tab-scaffold.build",
        actions: [
          {
            type: "shell",
            command: "npm install",
            description: `npm install (${path.resolve(inputs.projectPath, "tab")})`,
            cwd: path.resolve(inputs.projectPath, "tab"),
          },
          {
            type: "shell",
            command: "npm run build",
            description: `npm run build (${path.resolve(inputs.projectPath, "tab")})`,
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
        description: `MsBuild (${path.resolve(inputs.projectPath, "tab")})`,
        cwd: path.resolve(inputs.projectPath, "tab"),
      });
    } else return ok(undefined);
  }
}
