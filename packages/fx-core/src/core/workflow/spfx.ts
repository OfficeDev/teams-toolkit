// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  Action,
  AzureResource,
  DeployAction,
  MaybePromise,
  ProjectSettingsV3,
  ResourceConfig,
} from "./interface";
import { getResource } from "./workflow";

@Service("spfx")
export class SpfxResource implements AzureResource {
  name = "spfx";
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        const resource = getResource(context.projectSetting as ProjectSettingsV3, "spfx");
        if (!resource) {
          return ok([`ensure resource 'spfx' in projectSettings`]);
        }
        return ok([]);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const resource = getResource(projectSettings, "spfx");
        if (!resource) {
          const resource: ResourceConfig = {
            name: "spfx",
            provision: true,
          };
          projectSettings.resources.push(resource);
          console.log(`ensure resource 'spfx' in projectSettings`);
        }
        return ok(undefined);
      },
    };
    return ok(action);
  }
  deploy(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: DeployAction = {
      name: "spfx.deploy",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([
          `deploy spfx with path: ${inputs["spfx"].folder}, type: ${inputs["spfx"].type}`,
        ]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `deploy spfx with path: ${inputs["spfx"].folder}, type: ${inputs["spfx"].type}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
