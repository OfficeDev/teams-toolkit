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
    name: "api-plugin-type",
    type: "string",
    description: "API plugin type.",
    required: true,
    default: "new-api",
    choices: ["api-spec", "existing-plugin"],
  },
  {
    name: "plugin-manifest-path",
    type: "string",
    description: "Plugin manifest path.",
  },
  {
    name: "plugin-opeanapi-spec-path",
    type: "string",
    description: "OpenAPI description document used for your API plugin.",
  },
  {
    name: "openapi-spec-location",
    type: "string",
    shortName: "a",
    description: "OpenAPI description document location.",
  },
  {
    name: "api-operation",
    type: "array",
    shortName: "o",
    description: "Select operation(s) Copilot can interact with.",
  },
  {
    name: "teams-manifest-file",
    questionName: "manifest-path",
    type: "string",
    shortName: "t",
    description:
      "Specify the path for Teams app manifest template. It can be either absolute path or relative path to the project root folder, with default at './appPackage/manifest.json'",
    required: true,
    default: "./appPackage/manifest.json",
  },
];
export const AddPluginArguments: CLICommandArgument[] = [];
