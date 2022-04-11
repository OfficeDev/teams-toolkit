// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";

@Service("azure-web-app")
export class AzureWebAppResource implements CloudResource {
  readonly name = "azure-web-app";
  configure(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: Action = {
      name: "azure-web-app.configure",
      type: "function",
      plan: (context: ContextV3, inputs: Inputs) => {
        return ok(["configure azure web app"]);
      },
      execute: async (context: ContextV3, inputs: Inputs): Promise<Result<undefined, FxError>> => {
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
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([
          `deploy azure web app with path: ${inputs["azure-web-app"].folder}, type: ${inputs["azure-web-app"].type}`,
        ]);
      },
      execute: async (
        context: ContextV3,
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
