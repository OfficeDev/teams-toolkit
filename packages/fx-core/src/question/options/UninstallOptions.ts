// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/****************************************************************************************
 *                            NOTICE: AUTO-GENERATED                                    *
 ****************************************************************************************
 * This file is automatically generated by script "./src/question/generator.ts".        *
 * Please don't manually change its contents, as any modifications will be overwritten! *
 ***************************************************************************************/

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const UninstallOptions: CLICommandOption[] = [
  {
    name: "mode",
    type: "string",
    description: "Choose a way to clean up resources",
    required: true,
    default: "manifest-id",
    choices: ["manifest-id", "env", "title-id"],
  },
  {
    name: "manifest-id",
    type: "string",
    description: "Manifest ID",
  },
  {
    name: "env",
    type: "string",
    description: "Environment",
  },
  {
    name: "projectPath",
    type: "string",
    description: "Project Path for uninstall",
    default: "./",
  },
  {
    name: "options",
    type: "array",
    description: "Choose resources to uninstall",
    choices: ["m365-app", "app-registration", "bot-framework-registration"],
  },
  {
    name: "title-id",
    type: "string",
    description: "Title ID",
  },
];
export const UninstallArguments: CLICommandArgument[] = [];
