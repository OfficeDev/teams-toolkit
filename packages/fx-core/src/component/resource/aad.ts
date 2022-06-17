// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CloudResource,
  ContextV3,
  Effect,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProvisionContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";

//TODO
@Service("aad")
export class Aad implements CloudResource {
  readonly type = "cloud";
  readonly name = "aad";
  outputs = {};
  finalOutputKeys = [];
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "aad.provision",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "M365",
            remarks: "provision aad",
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Effect[], FxError>> => {
        const ctx = context as ProvisionContextV3;
        ctx.envInfo.state["aad"] = {
          clientId: "mockM365ClientId",
          clientSecret: "mockM365ClientId",
          authAuthorityHost: "mockM365OauthAuthorityHost",
          tenantId: "mockM365TenantId",
        };
        return ok([
          {
            type: "service",
            name: "M365",
            remarks: "provision aad",
          },
        ]);
      },
    };
    return ok(action);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "aad.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "M365",
            remarks: "configure aad",
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Effect[], FxError>> => {
        const ctx = context as ProvisionContextV3;
        ctx.envInfo.state["aad"].m365ApplicationIdUri = inputs.m365ApplicationIdUri;
        return ok([
          {
            type: "service",
            name: "M365",
            remarks: "config aad",
          },
        ]);
      },
    };
    return ok(action);
  }
}
