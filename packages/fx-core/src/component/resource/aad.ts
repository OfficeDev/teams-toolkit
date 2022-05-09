// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
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
        return ok(["provision aad"]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
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
        return ok([`configure aad`]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(`configure aad`);
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
