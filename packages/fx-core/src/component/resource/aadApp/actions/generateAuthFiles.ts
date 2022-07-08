// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  FunctionAction,
  FileEffect,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { ComponentNames, ActionTypeFunction } from "../../../constants";
import { createAuthFiles } from "../../../../plugins/solution/fx-solution/v2/executeUserTask";

export function GetActionGenerateAuthFiles(): FunctionAction {
  return {
    name: `${ComponentNames.AadApp}.generateAuthFiles`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const createFilePath = [path.join(inputs.projectPath, "auth")];
      const effect: FileEffect = {
        type: "file",
        operate: "create",
        filePath: createFilePath,
      };
      return ok([effect]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      await createAuthFiles(inputs, context, inputs.needsTab, inputs.needsBot);
      const createFilePath = [path.join(inputs.projectPath, "auth")];
      const effect: FileEffect = {
        type: "file",
        operate: "create",
        filePath: createFilePath,
      };
      return ok([effect]);
    },
  };
}
