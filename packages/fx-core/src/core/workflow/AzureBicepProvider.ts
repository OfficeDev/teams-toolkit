// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, ContextV3, MaybePromise } from "./interface";

@Service("azure-bicep")
export class AzureBicepProvider {
  readonly type = "bicep";
  readonly name = "azure-bot";
  generate(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-bicep.generate",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const azureBicepInputs = inputs["azure-bicep"];
        return ok([`generate bicep for: ${azureBicepInputs.resources}`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const azureBicepInputs = inputs["azure-bicep"];
        return ok(undefined);
      },
    };
    return ok(action);
  }
  update(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-bicep.update",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const azureBicepInputs = inputs["azure-bicep"];
        return ok([`update bicep for: ${azureBicepInputs.resources}`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const azureBicepInputs = inputs["azure-bicep"];
        return ok(undefined);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "azure-bicep.deploy",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["deploy bicep"]);
      },
      execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        console.log("deploy bicep");
        inputs["azure-storage"] = {
          endpoint: "MockStorageEndpoint",
        };
        inputs["azure-web-app"] = {
          endpoint: "MockAzureWebAppEndpoint",
        };
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
