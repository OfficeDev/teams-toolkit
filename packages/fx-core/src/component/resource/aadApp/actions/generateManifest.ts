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
import { generateAadManifestTemplate } from "../../../../core/generateAadManifestTemplate";

export function GetActionGenerateManifest(): FunctionAction {
  return {
    name: `${ComponentNames.AadApp}.generateManifest`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const createFilePath = [
        path.join(
          inputs.projectPath,
          "templates",
          "components",
          "aadApp",
          "manifest",
          "aadApp.template.json"
        ),
      ];
      const effect: FileEffect = {
        type: "file",
        operate: "create",
        filePath: createFilePath,
      };
      return ok([effect]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      await generateAadManifestTemplate(inputs.projectPath, context.projectSetting);
      const createFilePath = [
        path.join(inputs.projectPath, "templates", "appPackage", "aad.template.json"),
      ];
      const effect: FileEffect = {
        type: "file",
        operate: "create",
        filePath: createFilePath,
      };
      return ok([effect]);
    },
  };
}
