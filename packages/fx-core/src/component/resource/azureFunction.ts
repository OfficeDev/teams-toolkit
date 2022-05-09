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
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { persistProvisionBicepPlans } from "../bicepUtils";

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
        const plans = persistProvisionBicepPlans(inputs.projectPath, {
          Modules: { azureFunction: "1" },
          Orchestration: "1",
        });
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Bicep, FxError>> => {
        const bicep: Bicep = {
          Provision: {
            Modules: { azureFunction: "" },
            Orchestration: "",
          },
        };
        return ok(bicep);
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
        return ok(["configure azure function"]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `configure azure function using appSettings: ${JSON.stringify(
            inputs["azure-function.appSettings"]
          )}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
