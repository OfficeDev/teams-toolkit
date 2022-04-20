// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";
import * as path from "path";
@Service("azure-web-app-connection")
export class AzureWebAppConnection implements CloudResource {
  readonly name = "azure-web-app-connection";
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app-connection.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([`generate azure web app configuration bicep to connect to other services`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
