// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProvisionContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  configLocalEnvironment,
  setupLocalEnvironment,
} from "../plugins/solution/fx-solution/debug/provisionLocal";

@Service("debug-manager")
export class DebugManager {
  readonly name = "env-manager";
  setupLocalEnvironment(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    // const action: Action = {
    //   name: "debug-manager.setupLocalEnvironment",
    //   type: "function",
    //   plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    //     return ok(["set up local environment"]);
    //   },
    //   execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    //     const ctx = context as ProvisionContextV3;
    //     const localEnvSetupResult = await setupLocalEnvironment(ctx, inputs, ctx.envInfo);
    //     if (localEnvSetupResult.isErr()) {
    //       return err(localEnvSetupResult.error);
    //     }
    //     return ok(["set up local environment"]);
    //   },
    // };
    // return ok(action);
    return ok(undefined);
  }
  configLocalEnvironment(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    // const action: Action = {
    //   type: "function",
    //   name: "debug-manager.configLocalEnvironment",
    //   plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
    //     return ok(["config local environment"]);
    //   },
    //   execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    //     const ctx = context as ProvisionContextV3;
    //     const localConfigResult = await configLocalEnvironment(ctx, inputs, ctx.envInfo);
    //     if (localConfigResult.isErr()) {
    //       return err(localConfigResult.error);
    //     }
    //     return ok(["config local environment"]);
    //   },
    // };
    // return ok(action);
    return ok(undefined);
  }
}
