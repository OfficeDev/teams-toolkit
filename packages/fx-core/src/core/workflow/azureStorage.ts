// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";

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
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["generate azure-sql bicep"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const armTemplate: ArmTemplateResult = {
          Provision: {
            Modules: {},
          },
          Configuration: {},
          Reference: {
            sqlResourceId: "provisionOutputs.azureSqlOutput.value.resourceId",
            sqlEndpoint: "provisionOutputs.azureSqlOutput.value.sqlEndpoint",
            sqlDatabaseName: "provisionOutputs.azureSqlOutput.value.sqlDatabaseName",
          },
        };
        // {
        //   const filePath = path.join(
        //     getTemplatesFolder(),
        //     "demo",
        //     "azureSql.provision.module.bicep"
        //   );
        //   if (await fs.pathExists(filePath)) {
        //     const content = await fs.readFile(filePath, "utf-8");
        //     armTemplate.Provision!.Modules!["azureSql"] = content;
        //   }
        // }
        // {
        //   const filePath = path.join(
        //     getTemplatesFolder(),
        //     "demo",
        //     "azureSql.provision.orchestration.bicep"
        //   );
        //   if (await fs.pathExists(filePath)) {
        //     const content = await fs.readFile(filePath, "utf-8");
        //     armTemplate.Provision!.Orchestration = content;
        //   }
        // }
        if (!context.bicep) context.bicep = {};
        context.bicep["azure-sql"] = armTemplate;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  configure(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-storage.configure",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["configure azure storage (enable static web site)"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure storage (enable static web site)");
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
      name: "azure-storage.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const deployInputs = inputs["azure-storage"];
        return ok([
          `deploy azure storage with path: ${deployInputs.folder}, type: ${deployInputs.type}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
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
