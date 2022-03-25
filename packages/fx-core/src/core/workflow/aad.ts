// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, ResourcePlugin, MaybePromise, ProvisionAction } from "./interface";

@Service("aad")
export class AADResource implements ResourcePlugin {
  name = "aad";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
    return ok(undefined);
  }
  provision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "aad.provision",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("provision aad app registration");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
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
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "aad.configure",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("configure aad app registration");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
