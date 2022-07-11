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
import { getTemplatesFolder } from "../../../../folder";
import { ComponentNames, ActionNames, ActionTypeFunction } from "../../../constants";
import fs from "fs-extra";

export function GetActionGenerateBicep(): FunctionAction {
  return {
    name: `${ComponentNames.AadApp}.${ActionNames.generateBicep}`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const bicep: Bicep = {
        type: "bicep",
        Parameters: {},
      };
      return ok([bicep]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const bicep: Bicep = {
        type: "bicep",
        Parameters: await fs.readJson(
          path.join(getTemplatesFolder(), "bicep", "aadApp.parameters.json")
        ),
      };
      return ok([bicep]);
    },
  };
}
