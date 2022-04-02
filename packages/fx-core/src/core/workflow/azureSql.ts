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
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  ProvisionAction,
  ResourceConfig,
} from "./interface";
import { getResource } from "./workflow";

@Service("azure-sql")
export class AzureSqlResource implements AzureResource {
  readonly type = "azure";
  readonly name = "azure-sql";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const genSqlBicep: GenerateBicepAction = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        const resource = getResource(context.projectSetting as ProjectSettingsV3, "azure-sql");
        if (!resource) {
          return ok([
            "ensure resource 'azure-sql' in projectSettings",
            "generate bicep of azure-sql",
          ]);
        }
        return ok([]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const resource = getResource(projectSettings, "azure-sql");
        if (!resource) {
          const resource: ResourceConfig = {
            name: "azure-sql",
            provision: true,
          };
          projectSettings.resources.push(resource);
          inputs.bicep[this.name] = "azure-sql bicep";
          console.log("ensure resource azure-sql in projectSettings");
          console.log("generate bicep of azure-sql");
        }
        return ok(undefined);
      },
    };
    const webApp = getResource(projectSettings, "azure-web-app");
    const azureFunction = getResource(projectSettings, "azure-function");
    if (webApp || azureFunction) {
      const actions: Action[] = [genSqlBicep];
      if (webApp) {
        actions.push({
          type: "call",
          name: "call:azure-web-app.updateBicep",
          required: false,
          targetAction: "azure-web-app.updateBicep",
          inputs: { resource: "azure-sql" },
        });
      }
      if (azureFunction) {
        actions.push({
          type: "call",
          name: "call:azure-function.updateBicep",
          required: false,
          targetAction: "azure-function.updateBicep",
          inputs: { resource: "azure-sql" },
        });
      }
      const group: GroupAction = {
        type: "group",
        actions: actions,
      };
      return ok(group);
    } else {
      return ok(genSqlBicep);
    }
  }
  configure(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-sql.configure",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ) => {
        return ok(["configure azure-sql"]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure-sql");
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
