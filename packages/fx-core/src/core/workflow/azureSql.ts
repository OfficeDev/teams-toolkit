// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { generateBicepFromFile, getUuid } from "../../common/tools";
import { getTemplatesFolder } from "../../folder";
import { Action, Bicep, CloudResource, ContextV3, MaybePromise } from "./interface";
@Service("azure-sql")
export class AzureSqlResource implements CloudResource {
  readonly type = "cloud";
  readonly name = "azure-sql";
  outputs = {
    sqlResourceId: {
      key: "resourceId",
      bicepVariable: "provisionOutputs.azureSqlOutput.value.resourceId",
    },
    sqlEndpoint: {
      key: "endpoint",
      bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlEndpoint",
    },
    sqlDatabaseName: {
      key: "databaseName",
      bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlDatabaseName",
    },
  };
  finalOutputKeys = ["sqlResourceId", "endpoint", "databaseName"];
  generateBicep(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "azure-sql.generateBicep",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const sqlInputs = inputs["azure-sql"];
        return ok([`generate azure-sql bicep for new sql: ${sqlInputs.provisionType}`]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<Bicep, FxError>> => {
        const sqlInputs = inputs["azure-sql"];
        const prefix =
          sqlInputs.provisionType === "database"
            ? "azureSql.provisionDatabase"
            : "azureSql.provisionServer";
        const mPath = path.join(getTemplatesFolder(), "demo", `${prefix}.module.bicep`);
        const oPath = path.join(getTemplatesFolder(), "demo", `${prefix}.orchestration.bicep`);
        let module = await fs.readFile(mPath, "utf-8");
        let orch = await fs.readFile(oPath, "utf-8");
        const suffix = getUuid().substring(0, 6);
        const compileCtx = {
          suffix: suffix,
        };
        if (sqlInputs.provisionType === "database") {
          module = await generateBicepFromFile(mPath, compileCtx);
          orch = await generateBicepFromFile(oPath, compileCtx);
        }
        const bicep: Bicep = {
          Provision: {
            Modules: { azureSql: module },
            Orchestration: orch,
          },
        };
        return ok(bicep);
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
