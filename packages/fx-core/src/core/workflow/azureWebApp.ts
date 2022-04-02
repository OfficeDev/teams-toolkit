// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  GenerateBicepAction,
  MaybePromise,
  ProvisionAction,
  DeployAction,
  ProjectSettingsV3,
  ResourceConfig,
  AzureResource,
} from "./interface";
import { getResource } from "./workflow";

@Service("azure-web-app")
export class AzureWebAppResource implements AzureResource {
  readonly type = "azure";
  readonly name = "azure-web-app";
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: GenerateBicepAction = {
      name: "azure-web-app.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        const resource = getResource(context.projectSetting as ProjectSettingsV3, "azure-function");
        if (!resource) {
          return ok([
            `ensure resource azure-web-app in projectSettings`,
            `generate bicep of azure-web-app`,
          ]);
        }
        return ok([]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const resource = getResource(projectSettings, "azure-web-app");
        if (!resource) {
          const resource: ResourceConfig = {
            name: "azure-web-app",
            provision: true,
          };
          projectSettings.resources.push(resource);
          inputs.bicep[this.name] = `azure-web-app bicep`;
          console.log(`ensure resource azure-web-app in projectSettings`);
          console.log(`generate bicep of azure-web-app`);
        }
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
        return ok([`update azure-web-app bicep with added resource: ${inputs.resource}`]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("update azure-web-app bicep");
        inputs.bicep[this.name] = "azure-web-app bicep (updated)";
        return ok(undefined);
      },
    };
    return ok(action);
  }
  configure(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-web-app.configure",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ) => {
        return ok(["configure azure web app"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `configure azure web app using appSettings: ${JSON.stringify(
            inputs["azure-web-app"].appSettings
          )}`
        );
        return ok(undefined);
      },
    };
    return ok(configure);
  }
  deploy(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: DeployAction = {
      name: "azure-web-app.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([
          `deploy azure web app with path: ${inputs["azure-web-app"].folder}, type: ${inputs["azure-web-app"].type}`,
        ]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `deploy azure web app with path: ${inputs["azure-web-app"].folder}, type: ${inputs["azure-web-app"].type}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
