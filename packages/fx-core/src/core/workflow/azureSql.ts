// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  ok,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AddInstanceAction,
  ResourcePlugin,
  GenerateBicepAction,
  GroupAction,
  MaybePromise,
  ProvisionAction,
} from "./interface";

@Service("azure-sql")
export class AzureSqlResource implements ResourcePlugin {
  name = "azure-sql";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-sql.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([
          `ensure entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`,
        ]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes(this.name))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const genSqlBicep: GenerateBicepAction = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["generate azure sql bicep"]);
      },
      execute: async (
        context: v2.Context,
        inputs: Inputs
      ): Promise<Result<v3.BicepTemplate[], FxError>> => {
        console.log("generate azure sql bicep");
        return ok([]);
      },
    };
    const actions: Action[] = [];
    const solutionSetting = context.projectSetting.solutionSettings as AzureSolutionSettings;
    if (solutionSetting.activeResourcePlugins.includes("azure-web-app")) {
      actions.push({
        type: "call",
        required: false,
        targetAction: "azure-web-app.updateBicep",
        inputs: { resource: "azure-sql" },
      });
    }
    if (solutionSetting.activeResourcePlugins.includes("azure-function")) {
      actions.push({
        type: "call",
        required: false,
        targetAction: "azure-function.updateBicep",
        inputs: { resource: "azure-sql" },
      });
    }
    if (actions.length > 0) {
      const group: GroupAction = {
        type: "group",
        actions: actions,
      };
      return ok(group);
    } else {
      return ok(genSqlBicep);
    }
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-sql.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["configure azure sql"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure sql");
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
