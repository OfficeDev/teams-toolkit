// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok } from "@microsoft/teamsfx-api";
import { logger } from "../../commonlib/logger";
import { FooterText } from "../../constants";
import { helper } from "../helper";
import { CLICommand, CLIContext } from "../types";
import { createCommand } from "./create";

export const rootCommand: CLICommand = {
  name: "teamsfx",
  description: "Teams toolkit CLI.",
  footer: FooterText,
  commands: [createCommand],
  options: [
    {
      type: "boolean",
      name: "version",
      shortName: "v",
      description: "Show version number.",
    },
    {
      type: "boolean",
      name: "help",
      shortName: "h",
      description: "Show help message.",
    },
    {
      type: "boolean",
      name: "interactive",
      shortName: "i",
      description: "Run the command in interactive mode.",
      default: true,
    },
    {
      type: "boolean",
      name: "debug",
      description: "Print debug information.",
      default: false,
    },
    {
      type: "boolean",
      name: "verbose",
      description: "Print diagnostic information.",
      default: false,
    },
  ],
  handler: async (cmd: CLIContext) => {
    const helpText = helper.formatHelp(rootCommand, rootCommand);
    logger.info(helpText);
    return ok(undefined);
  },
};
