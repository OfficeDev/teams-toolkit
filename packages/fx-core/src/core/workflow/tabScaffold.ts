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
  TeamsTabInputs,
} from "./interface";

/**
 * tab scaffold plugin
 */
@Service("tab-scaffold")
export class TabScaffoldResource implements ScaffoldResource {
  readonly type = "scaffold";
  readonly name = "tab-scaffold";
  generateCode(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "tab-scaffold.generateCode",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
        const language = teamsTabInputs.language || context.projectSetting.programmingLanguage;
        const framework = teamsTabInputs.framework || "none";
        const folder = teamsTabInputs.folder || "tab";
        return ok([
          "add resource 'tab-scaffold' in projectSettings",
          `scaffold tab source code for language: ${language}, framework: ${framework}, hostingResource: ${teamsTabInputs.hostingResource}, folder: ${folder}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
        const language = (teamsTabInputs.language || context.projectSetting.programmingLanguage) as
          | "csharp"
          | "javascript"
          | "typescript";
        const framework = teamsTabInputs.framework || "none";
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const folder = teamsTabInputs.folder;
        const resourceConfig: ResourceConfig = {
          name: "tab-scaffold",
          build: true,
          deployType: "zip",
          folder: folder,
          language: language,
          framework: framework,
          hostingResource: teamsTabInputs.hostingResource,
        };
        projectSettings.resources.push(resourceConfig);
        console.log("add resource 'tab-scaffold' in projectSettings");
        console.log(`scaffold tab source code for: ${JSON.stringify(resourceConfig)}`);
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
