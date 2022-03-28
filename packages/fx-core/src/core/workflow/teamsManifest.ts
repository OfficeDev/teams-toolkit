// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, AddInstanceAction, MaybePromise, ProvisionAction } from "./interface";

@Service("teams-manifest")
export class TeamsManifestResource {
  name = "teams-manifest";
  init(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const init: AddInstanceAction = {
      name: "teams-manifest.init",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(["init manifest template"]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("init manifest template");
        return ok(undefined);
      },
    };
    return ok(init);
  }
  addCapability(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const init: AddInstanceAction = {
      name: "teams-manifest.addCapability",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([`add capability in teams manifest: ${inputs["capabilities"]}`]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`add capability in teams manifest: ${inputs["capabilities"]}`);
        return ok(undefined);
      },
    };
    return ok(init);
  }
  provision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "teams-manifest.provision",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(["provision teams manifest"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `provision teams manifest with tab:${inputs.tab.endpoint} and bot:${inputs["azure-bot"].botId}`
        );
        return ok(undefined);
      },
    };
    return ok(provision);
  }
}
