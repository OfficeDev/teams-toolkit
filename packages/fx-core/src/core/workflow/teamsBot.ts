// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ensureSolutionSettings } from "../../plugins/solution/fx-solution/utils/solutionSettingsHelper";
import {
  Action,
  AddInstanceAction,
  AzureResourcePlugin,
  GroupAction,
  MaybePromise,
} from "./interface";

@Service("nodejs-bot")
export class NodejsBotResource implements AzureResourcePlugin {
  name = "nodejs-bot";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "nodejs-bot.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        const resource = inputs.notification ? "azure-function" : "azure-web-app";
        return ok(
          `ensure entry '${resource}', 'azure-bot' in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        ensureSolutionSettings(context.projectSetting);
        const resource = inputs.notification ? "azure-function" : "azure-web-app";
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes(resource))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push(resource);
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes("azure-bot"))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push("azure-bot");
        console.log(
          `ensure entry '${resource}', 'azure-bot' in projectSettings.solutionSettings.activeResourcePlugins`
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
            capabilities: ["Bot"],
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
    const addInstance: AddInstanceAction = {
      name: "nodejs-bot.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(`scaffold nodejs bot source code, with notification: ${inputs.notification}`);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`scaffold nodejs bot source code, with notification: ${inputs.notification}`);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const resource = inputs.notification ? "azure-function" : "azure-web-app";
    return ok({
      type: "call",
      required: true,
      targetAction: `${resource}.generateBicep`,
    });
  }
}
