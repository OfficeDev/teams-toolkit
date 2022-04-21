// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../common/armInterface";
import { getTemplatesFolder } from "../../folder";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";
@Service("azure-sql")
export class AzureSqlResource implements CloudResource {
  readonly type = "cloud";
  readonly name = "azure-sql";
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
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureSql.provision.module.bicep"
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Provision!.Modules!["azureSql"] = content;
          }
        }
        {
          const filePath = path.join(
            getTemplatesFolder(),
            "demo",
            "azureSql.provision.orchestration.bicep"
          );
          if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, "utf-8");
            armTemplate.Provision!.Orchestration = content;
          }
        }
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
      name: "azure-sql.configure",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["configure azure-sql"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure-sql");
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
