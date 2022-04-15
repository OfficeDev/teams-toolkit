// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";
import * as path from "path";
@Service("azure-web-app")
export class AzureWebAppResource implements CloudResource {
  readonly name = "azure-web-app";
  deploy(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-web-app.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok([
          `deploy azure web app in folder: ${path.join(
            inputs.projectPath,
            inputs["azure-web-app"].folder
          )}`,
        ]);
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
