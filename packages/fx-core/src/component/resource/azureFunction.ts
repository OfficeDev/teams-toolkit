// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  CloudResource,
  ContextV3,
  MaybePromise,
  Bicep,
  InputsWithProjectPath,
  Effect,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";

@Service("azure-function")
export class AzureFunctionResource implements CloudResource {
  readonly name = "azure-function";
  outputs = {
    resourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureFunctionOutput.value.resourceId",
    },
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureFunctionOutput.value.sqlEndpoint",
    },
  };
  finalOutputKeys = ["resourceId", "endpoint"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "bicep",
            Modules: { azureFunction: "1" },
            Orchestration: "1",
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Effect[], FxError>> => {
        const bicep: Bicep = {
          type: "bicep",
          Provision: {
            Modules: { azureFunction: "" },
            Orchestration: "",
          },
        };
        return ok([bicep]);
      },
    };
    return ok(action);
  }
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
