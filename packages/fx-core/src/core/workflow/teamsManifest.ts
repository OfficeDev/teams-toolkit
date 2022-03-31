// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, ContextV3, MaybePromise, ProvisionAction } from "./interface";

@Service("teams-manifest")
export class TeamsManifestResource {
  name = "teams-manifest";
  init(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "teams-manifest.init",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["init manifest template"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("init manifest template");
        return ok(undefined);
      },
    };
    return ok(action);
  }
  addCapability(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "teams-manifest.addCapability",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const addInputs = inputs[this.name];
        return ok([`add capability in teams manifest: ${JSON.stringify(addInputs)}`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const addInputs = inputs[this.name];
        console.log(`add capability in teams manifest: ${JSON.stringify(addInputs)}`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
  provision(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "teams-manifest.provision",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok(["provision teams manifest"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        const teamsManifestInputs = inputs[this.name];
        console.log(`provision teams manifest:${JSON.stringify(teamsManifestInputs)}`);
        return ok(undefined);
      },
    };
    return ok(provision);
  }
}
