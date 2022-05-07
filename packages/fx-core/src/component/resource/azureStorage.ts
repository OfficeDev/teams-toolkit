// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Bicep,
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
import { persistProvisionBicepPlans } from "../bicepUtils";

@Service("azure-storage")
export class AzureStorageResource implements CloudResource {
  readonly name = "azure-storage";
  readonly outputs = {
    endpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureStorageOutput.value.endpoint",
    },
  };
  readonly finalOutputKeys = ["endpoint"];
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const plans = persistProvisionBicepPlans(inputs.projectPath, {
          Modules: { azureStorage: "1" },
          Orchestration: "1",
        });
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Bicep, FxError>> => {
        const armTemplate: Bicep = {
          Provision: {
            Modules: {},
          },
          Configuration: {},
        };
        return ok(armTemplate);
      },
    };
    return ok(action);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["configure azure storage (enable static web site)"]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure storage (enable static web site)");
        return ok(undefined);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const deployInputs = inputs["azure-storage"];
        return ok([
          `deploy azure storage with path: ${deployInputs.folder}, type: ${deployInputs.type}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const deployInputs = inputs["azure-storage"];
        console.log(
          `deploy azure storage with path: ${deployInputs.folder}, type: ${deployInputs.type}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
