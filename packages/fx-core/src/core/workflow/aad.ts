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

@Service("aad")
export class AADResource implements AzureResource {
  name = "aad";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "aad.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const resource = getResource(context.projectSetting as ProjectSettingsV3, "aad");
        if (!resource) {
          return ok(["ensure resource aad in projectSettings", "generate code of aad"]);
        }
        return ok([]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const resource = getResource(projectSettings, "aad");
        if (!resource) {
          const resource: ResourceConfig = {
            name: this.name,
            provision: true,
          };
          projectSettings.resources.push(resource);
          inputs.bicep[this.name] = "aad bicep";
          console.log("ensure resource 'aad' in projectSettings");
          console.log("generate bicep of 'aad");
        }
        return ok(undefined);
      },
    };
    return ok(generateBicep);
  }
  provision(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "aad.provision",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok(["provision aad"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("provision aad");
        inputs.aad = {
          clientId: "mockM365ClientId",
          clientSecret: "mockM365ClientId",
          authAuthorityHost: "mockM365OauthAuthorityHost",
          tenantId: "mockM365TenantId",
        };
        return ok(undefined);
      },
    };
    return ok(provision);
  }
  configure(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "aad.configure",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([`configure aad`]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(`configure aad`);
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
