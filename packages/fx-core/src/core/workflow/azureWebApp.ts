// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AddInstanceAction,
  ResourcePlugin,
  GenerateBicepAction,
  MaybePromise,
  ProvisionAction,
  DeployAction,
} from "./interface";

@Service("azure-web-app")
export class AzureWebAppResource implements ResourcePlugin {
  name = "azure-web-app";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-web-app.addInstance",
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
    const action: GenerateBicepAction = {
      name: "azure-web-app.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["generate azure web app bicep"]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("generate azure web app bicep");
        inputs.bicep[this.name] = "azure web app bicep";
        return ok(undefined);
      },
    };
    return ok(action);
  }
  updateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: GenerateBicepAction = {
      name: "azure-web-app.updateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([`update azure web app bicep with added resource: ${inputs.resource}`]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("update azure web app bicep");
        inputs.bicep[this.name] = "azure web app bicep (updated)";
        return ok(undefined);
      },
    };
    return ok(action);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-web-app.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["configure azure web app"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `configure azure web app using appSettings: ${JSON.stringify(
            inputs["azure-web-app.appSettings"]
          )}`
        );
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
      name: "azure-web-app.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([`deploy azure web app with path: ${inputs.path}, type: ${inputs.type}`]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`deploy azure web app with path: ${inputs.path}, type: ${inputs.type}`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
