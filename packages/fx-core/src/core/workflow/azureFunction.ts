// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AzureResource,
  ContextV3,
  GenerateBicepAction,
  MaybePromise,
  ProjectSettingsV3,
  ProvisionAction,
  ResourceConfig,
} from "./interface";
import { getResource } from "./workflow";

@Service("azure-function")
export class AzureFunctionResource implements AzureResource {
  readonly type = "azure";
  readonly name = "azure-function";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "azure-function.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const resource = getResource(context.projectSetting as ProjectSettingsV3, "azure-function");
        if (!resource) {
          return ok([
            `ensure resource 'azure-function' in projectSettings`,
            `generate bicep of azure-function`,
          ]);
        }
        return ok([]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const resource = getResource(projectSettings, "azure-function");
        if (!resource) {
          const resource: ResourceConfig = {
            name: "azure-function",
            provision: true,
          };
          projectSettings.resources.push(resource);
          inputs.bicep[this.name] = "azure-function bicep";
          console.log("add resource 'azure-function' in projectSettings");
          console.log("generate bicep of azure-function");
        }
        return ok(undefined);
      },
    };
    return ok(generateBicep);
  }
  updateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "azure-function.updateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok([`update bicep of azure-function with added resource: ${inputs.resource}`]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`update bicep of azure-function with added resource: ${inputs.resource}`);
        inputs.bicep[
          "azure-function"
        ] = `updated bicep ofazure-function with added resource: ${inputs.resource}`;
        return ok(undefined);
      },
    };
    return ok(generateBicep);
  }
  configure(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-function.configure",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ) => {
        return ok(["configure azure function"]);
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
