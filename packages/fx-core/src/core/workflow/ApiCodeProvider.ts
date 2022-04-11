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
} from "./interface";
import { getComponent } from "./workflow";

@Service("api-code")
export class ApiCodeProvider implements SourceCodeProvider {
  readonly name = "api-code";
  generate(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "api-code.generate",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const resource = getComponent(context.projectSetting, "api-code");
        if (!resource) {
          return ok(["ensure resource 'api-code' in projectSettings", "generate code of function"]);
        }
        return ok([]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting;
        const funcInputs = inputs["api-code"];
        const resource = getComponent(projectSettings, "api-code");
        if (!resource) {
          const resource: Component = {
            name: "api-code",
            build: true,
            hostingResource: "azure-function",
            folder: funcInputs.folder || "api",
          };
          projectSettings.components.push(resource);
          console.log("ensure resource 'api-code' in projectSettings");
          console.log("generate code of function api");
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
        name: "api-code.build",
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
        name: "api-code.build",
        command: "MsBuild",
        description: `MsBuild (${path.resolve(inputs.projectPath, "api")})`,
        cwd: path.resolve(inputs.projectPath, "api"),
      });
    } else return ok(undefined);
  }
}
