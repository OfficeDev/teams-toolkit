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
} from "./interface";
import { getResource } from "./workflow";

@Service("function-scaffold")
export class FunctionScaffoldResource implements ScaffoldResource {
  readonly type = "scaffold";
  readonly name = "function-scaffold";
  generateCode(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "function-scaffold.generateCode",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const resource = getResource(context.projectSetting, "function-scaffold");
        if (!resource) {
          return ok([
            "ensure resource 'function-scaffold' in projectSettings",
            "generate code of function",
          ]);
        }
        return ok([]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting;
        const funcInputs = inputs["function-scaffold"];
        const resource = getResource(projectSettings, "function-scaffold");
        if (!resource) {
          const resource: ResourceConfig = {
            name: "function-scaffold",
            build: true,
            hostingResource: "azure-function",
            folder: funcInputs.folder || "api",
          };
          projectSettings.resources.push(resource);
          console.log("ensure resource 'function-scaffold' in projectSettings");
          console.log("generate code of function");
        }
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
        name: "function-scaffold.build",
        actions: [
          {
            type: "shell",
            command: "npm install",
            description: `npm install (${path.resolve(inputs.projectPath, "api")})`,
            cwd: path.resolve(inputs.projectPath, "api"),
          },
          {
            type: "shell",
            command: "npm run build",
            description: `npm run build (${path.resolve(inputs.projectPath, "api")})`,
            cwd: path.resolve(inputs.projectPath, "api"),
          },
        ],
      };
      return ok(group);
    } else if (language === "csharp") {
      return ok({
        type: "shell",
        name: "function-scaffold.build",
        command: "MsBuild",
        description: `MsBuild (${path.resolve(inputs.projectPath, "api")})`,
        cwd: path.resolve(inputs.projectPath, "api"),
      });
    } else return ok(undefined);
  }
}
