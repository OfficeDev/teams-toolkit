// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, AzureResource, DeployAction, MaybePromise } from "./interface";

@Service("spfx")
export class SpfxResource implements AzureResource {
  name = "spfx";
  deploy(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: DeployAction = {
      name: "spfx.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([`deploy spfx with path: ${inputs["spfx"].path}, type: ${inputs["spfx"].type}`]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`deploy spfx with path: ${inputs["spfx"].path}, type: ${inputs["spfx"].type}`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
