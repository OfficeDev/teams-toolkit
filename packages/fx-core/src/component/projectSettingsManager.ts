// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../core/middleware/projectSettingsLoader";
import * as uuid from "uuid";
import { LocalCrypto } from "../core/crypto";

@Service("project-settings")
export class ProjectSettingsManager {
  name = "project-settings";
  load(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "project-settings.load",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const filePath = getProjectSettingsPath(inputs.projectPath);
        const projectSettings = (await fs.readJson(filePath)) as ProjectSettingsV3;
        if (!projectSettings.projectId) {
          projectSettings.projectId = uuid.v4();
        }
        context.projectSetting = projectSettings;
        context.cryptoProvider = new LocalCrypto(projectSettings.projectId);
        return ok([]);
      },
    };
    return ok(action);
  }
  write(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "project-settings.write",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "file",
            filePath: getProjectSettingsPath(inputs.projectPath),
            operate: "replace",
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const filePath = getProjectSettingsPath(inputs.projectPath);
        await fs.writeFile(filePath, JSON.stringify(context.projectSetting, null, 4));
        return ok([
          {
            type: "file",
            filePath: filePath,
            operate: "replace",
          },
        ]);
      },
    };
    return ok(action);
  }
}

export const LoadProjectSettingsAction: CallAction = {
  type: "call",
  name: "call project-settings.load",
  targetAction: "project-settings.load",
  required: true,
};

export const WriteProjectSettingsAction: CallAction = {
  type: "call",
  name: "call project-settings.write",
  targetAction: "project-settings.write",
  required: true,
};
