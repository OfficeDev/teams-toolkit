// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, AddInstanceAction, DeployAction, MaybePromise, ResourcePlugin } from "./interface";

@Service("spfx")
export class SpfxResource implements ResourcePlugin {
  name = "spfx";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "spfx.addInstance",
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
        console.log(
          `ensure entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes(this.name))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  deploy(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: DeployAction = {
      name: "spfx.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([`deploy spfx with path: ${inputs.path}, type: ${inputs.type}`]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`deploy spfx with path: ${inputs.path}, type: ${inputs.type}`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
