// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ensureSolutionSettings } from "../../plugins/solution/fx-solution/utils/solutionSettingsHelper";
import {
  Action,
  AddInstanceAction,
  ResourcePlugin,
  GroupAction,
  MaybePromise,
  CallAction,
} from "./interface";

export interface TeamsTabInputs extends v2.InputsWithProjectPath {
  language: "csharp" | "javascript" | "typescript";
  framework: "react" | "vue" | "angular";
  hostingResource: "azure-web-app" | "azure-function" | "azure-storage";
}

/**
 * teams tab - feature level action
 */
@Service("teams-tab")
export class TeamsTabFeature implements ResourcePlugin {
  name = "teams-tab";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const tabInputs = inputs as TeamsTabInputs;
    const addInstance: AddInstanceAction = {
      name: "teams-tab.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `ensure entry '${tabInputs.hostingResource}' in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        ensureSolutionSettings(context.projectSetting);
        if (
          !context.projectSetting.solutionSettings?.activeResourcePlugins.includes(
            tabInputs.hostingResource
          )
        )
          context.projectSetting.solutionSettings?.activeResourcePlugins.push(
            tabInputs.hostingResource
          );
        console.log(
          `ensure entry '${tabInputs.hostingResource}' in projectSettings.solutionSettings.activeResourcePlugins`
        );
        return ok(undefined);
      },
    };
    const group: GroupAction = {
      type: "group",
      actions: [
        addInstance,
        {
          type: "call",
          required: true,
          targetAction: "teams-manifest.addCapability",
          inputs: {
            capabilities: ["Tab"],
          },
        },
      ],
    };
    return ok(group);
  }
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: CallAction = {
      name: "teams-tab.generateCode",
      type: "call",
      required: true,
      targetAction: "tab-scaffold.generateCode",
    };
    return ok(action);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const tabInputs = inputs as TeamsTabInputs;
    return ok({
      type: "call",
      required: true,
      targetAction: `${tabInputs.hostingResource}.generateBicep`,
    });
  }
}
