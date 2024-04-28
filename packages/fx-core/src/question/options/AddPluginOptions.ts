// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/****************************************************************************************
 *                            NOTICE: AUTO-GENERATED                                    *
 ****************************************************************************************
 * This file is automatically generated by script "./src/question/generator.ts".        *
 * Please don't manually change its contents, as any modifications will be overwritten! *
 ***************************************************************************************/

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const AddPluginOptions: CLICommandOption[] = [
  {
    name: "teams-manifest-file",
    questionName: "manifest-path",
    type: "string",
    shortName: "t",
    description:
      "Specifies the Microsoft Teams app manifest template file path, it can be either absolute path or relative path to project root folder, defaults to './appPackage/manifest.json'",
    required: true,
    default: "./appPackage/manifest.json",
  },
  {
    name: "plugin-availability",
    type: "string",
    description: "Select plugin availability.",
    required: true,
    choices: ["copilot-plugin", "action", "copilot-plugin-and-action"],
  },
  {
    name: "openapi-spec-location",
    type: "string",
    shortName: "a",
    description: "OpenAPI description document location.",
    required: true,
  },
  {
    name: "api-operation",
    type: "array",
    shortName: "o",
    description: "Select Operation(s) Copilot Can Interact with.",
    required: true,
  },
];
export const AddPluginArguments: CLICommandArgument[] = [];