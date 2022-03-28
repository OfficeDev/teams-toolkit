// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AddInstanceAction,
  DeployAction,
  GenerateBicepAction,
  MaybePromise,
  ProvisionAction,
  ResourcePlugin,
} from "./interface";

@Service("azure-storage")
export class AzureStorageResource implements ResourcePlugin {
  name = "azure-storage";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-storage.addInstance",
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
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "azure-storage.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["generate azure storage bicep"]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("generate azure storage bicep");
        inputs.bicep[this.name] = "azure storage bicep";
        return ok(undefined);
      },
    };
    return ok(generateBicep);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-storage.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["configure azure storage (enable static web site)"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure storage (enable static web site)");
        return ok(undefined);
      },
    };
    return ok(configure);
  }
  deploy(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: DeployAction = {
      name: "azure-storage.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([`deploy azure storage with path: ${inputs.path}, type: ${inputs.type}`]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`deploy azure storage with path: ${inputs.path}, type: ${inputs.type}`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
