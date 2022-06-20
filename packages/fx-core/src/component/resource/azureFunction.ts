// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
  Effect,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { AzureResource } from "./azureResource";
@Service("azure-function")
export class AzureFunctionResource extends AzureResource {
  readonly name = "azure-function";
  readonly bicepModuleName = "azureFunction";
  outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureFunctionOutput.value.resourceId",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureFunctionOutput.value.endpoint",
    },
  };
  finalOutputKeys = ["resourceId", "endpoint"];
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-function.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "config azure function",
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Effect[], FxError>> => {
        // Configure APIM
        return ok([
          {
            type: "service",
            name: "azure",
            remarks: "config azure function",
          },
        ]);
      },
    };
    return ok(action);
  }
}
