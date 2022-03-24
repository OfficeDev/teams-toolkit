// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AddInstanceAction,
  AzureResourcePlugin,
  GenerateBicepAction,
  MaybePromise,
  ProvisionAction,
} from "./interface";

@Service("azure-function")
export class AzureFunctionResource implements AzureResourcePlugin {
  name = "azure-function";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-function.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `add an entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
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
    const generateBicep: GenerateBicepAction = {
      name: "azure-function.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("generate azure function bicep");
      },
      execute: async (
        context: v2.Context,
        inputs: Inputs
      ): Promise<Result<v3.BicepTemplate[], FxError>> => {
        console.log("generate azure function bicep");
        return ok([]);
      },
    };
    return ok(generateBicep);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-function.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("configure azure function");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `configure azure function using appSettings: ${JSON.stringify(
            inputs["azure-function.appSettings"]
          )}`
        );
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
