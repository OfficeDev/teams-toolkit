// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/****************************************************************************************
 *                            NOTICE: AUTO-GENERATED                                    *
 ****************************************************************************************
 * This file is automatically generated by script "./src/question/generator.ts".        *
 * Please don't manually change its contents, as any modifications will be overwritten! *
 ***************************************************************************************/

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const DeclarativeAgentBotOptions: CLICommandOption[] = [
  {
    name: "declarative-agent-manifest-file",
    questionName: "declarative-agent-path",
    type: "string",
    shortName: "d",
    description:
      "Specify the path for Declarative Agent json file. It can be either absolute path or relative path to the project root folder, with default at './appPackage/declarativeAgent.json'",
    required: true,
    default: "./appPackage/declarativeAgent.json",
  },
];
export const DeclarativeAgentBotArgument: CLICommandArgument[] = [];
