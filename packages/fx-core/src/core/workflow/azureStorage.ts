// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  DeployAction,
  GenerateBicepAction,
  MaybePromise,
  ProvisionAction,
  AzureResource,
  ProjectSettingsV3,
  ContextV3,
  ResourceConfig,
} from "./interface";
import { getResource } from "./workflow";

@Service("azure-storage")
export class AzureStorageResource implements AzureResource {
  name = "azure-storage";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "azure-storage.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const resource = getResource(context.projectSetting as ProjectSettingsV3, "azure-function");
        if (!resource) {
          return ok([
            "ensure resource 'azure-storage' in projectSettings",
            "generate bicep of 'azure-storage'",
          ]);
        }
        return ok([]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const resource = getResource(projectSettings, "azure-storage");
        if (!resource) {
          const resource: ResourceConfig = {
            name: "azure-storage",
            provision: true,
          };
          projectSettings.resources.push(resource);
          inputs.bicep["azure-storage"] = `azure-storage bicep`;
          console.log("ensure resource 'azure-storage' in projectSettings");
          console.log("generate bicep of 'azure-storage'");
        }
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
      name: "azure-storage.configure",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ) => {
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
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: DeployAction = {
      name: "azure-storage.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        const deployInputs = inputs["azure-storage"];
        return ok([
          `deploy azure storage with path: ${deployInputs.folder}, type: ${deployInputs.type}`,
        ]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const deployInputs = inputs["azure-storage"];
        console.log(
          `deploy azure storage with path: ${deployInputs.folder}, type: ${deployInputs.type}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
