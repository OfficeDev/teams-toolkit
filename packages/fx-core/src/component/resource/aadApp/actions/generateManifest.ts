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
import { getProjectTemplatesFolderPath } from "../../../../common/utils";
import { convertProjectSettingsV3ToV2 } from "../../../migrate";

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
      const projectSetting = convertProjectSettingsV3ToV2(context.projectSetting);
      await generateAadManifestTemplate(inputs.projectPath, projectSetting);
      const createFilePath = [
        path.join(
          await getProjectTemplatesFolderPath(inputs.projectPath),
          "appPackage",
          "aad.template.json"
        ),
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
