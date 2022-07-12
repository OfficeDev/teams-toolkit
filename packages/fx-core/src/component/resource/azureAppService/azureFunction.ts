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
import { Service } from "typedi";
import { AzureAppService } from "./azureAppService";
@Service("azure-function")
export class AzureFunctionResource extends AzureAppService {
  readonly name = "azure-function";
  readonly alias = "FT";
  readonly displayName = "Azure Functions";
  readonly bicepModuleName = "azureFunction";
  outputs = {
    functionAppResourceId: {
      key: "functionAppResourceId",
      bicepVariable:
        "provisionOutputs.azureFunction{{componentName}}Output.value.functionAppResourceId",
    },
    functionEndpoint: {
      key: "functionEndpoint",
      bicepVariable: "azureFunction{{componentName}}Provision.outputs.functionEndpoint",
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
