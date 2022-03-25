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
  TeamsTabInputs,
  ProjectConfig,
} from "./interface";

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
    const register: AddInstanceAction = {
      name: "teams-tab.register",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([
          "add 'tab' entry in projectSettings",
          `ensure entry '${tabInputs.hostingResource}' in projectSettings.solutionSettings.activeResourcePlugins`,
        ]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        ensureSolutionSettings(context.projectSetting);
        const projectConfig = context.projectSetting as ProjectConfig;
        projectConfig.tab = {
          language: tabInputs.language,
          hostingResource: tabInputs.hostingResource,
        };
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
      name: "teams-tab.addInstance",
      actions: [
        register,
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
  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok({
      type: "call",
      targetAction: "tab-scaffold.build",
      required: true,
    });
  }
  deploy(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const tabConfig = (context.projectSetting as any).tab;
    const hostResource = tabConfig.hostingResource;
    const action: GroupAction = {
      type: "group",
      name: "teams-tab.deploy",
      actions: [
        {
          type: "call",
          targetAction: "teams-tab.build",
          required: false,
        },
        {
          type: "call",
          targetAction: `${hostResource}.deploy`,
          required: false,
          inputs: {
            path: "tab",
            type: "folder",
          },
        },
      ],
    };
    return ok(action);
  }
}
