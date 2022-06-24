// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  Bicep,
  ok,
  FunctionAction,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { getUuid, generateBicepFromFile } from "../../../../common";
import { getTemplatesFolder } from "../../../../folder";
import {
  ComponentNames,
  ActionNames,
  ActionTypeFunction,
  BicepConstants,
} from "../../../constants";
import fs from "fs-extra";

export function GetActionGenerateBicep(): FunctionAction {
  return {
    name: `${ComponentNames.AzureSQL}.${ActionNames.generateBicep}`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const bicep: Bicep = {
        type: "bicep",
        Provision: {
          Modules: { azureSql: BicepConstants.writeFile },
          Orchestration: BicepConstants.writeFile,
        },
        Parameters: {},
      };
      return ok([bicep]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const prefix =
        inputs.provisionType === "database"
          ? "azureSql.provisionDatabase"
          : "azureSql.provisionServer";
      const mPath = path.join(getTemplatesFolder(), "bicep", `${prefix}.module.bicep`);
      const oPath = path.join(getTemplatesFolder(), "bicep", `${prefix}.orchestration.bicep`);
      let module = await fs.readFile(mPath, "utf-8");
      let orch = await fs.readFile(oPath, "utf-8");
      const suffix = getUuid().substring(0, 6);
      const compileCtx = {
        suffix: suffix,
      };
      if (inputs.provisionType === "database") {
        module = await generateBicepFromFile(mPath, compileCtx);
        orch = await generateBicepFromFile(oPath, compileCtx);
      }
      const bicep: Bicep = {
        type: "bicep",
        Provision: {
          Modules: { azureSql: module },
          Orchestration: orch,
        },
      };
      if (inputs.provisionType === "server") {
        bicep.Parameters = await fs.readJson(
          path.join(getTemplatesFolder(), "bicep", "azureSql.parameters.json")
        );
      }
      return ok([bicep]);
    },
  };
}
