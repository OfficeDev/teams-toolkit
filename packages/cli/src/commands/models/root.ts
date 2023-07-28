// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok } from "@microsoft/teamsfx-api";
import chalk from "chalk";
import { CliCommand, CliContext } from "../types";
import { createCommandModel } from "./create";
import { FooterText } from "../../constants";

export const rootCommand: CliCommand = {
  name: "teamsfx",
  description: "Teams toolkit CLI.",
  footer: FooterText,
  commands: [createCommandModel],
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
  handler: async (cmd: CliContext) => {
    process.stdout.write(chalk.yellowBright.bold("Microsoft Teams Toolkit\n"));
    return ok(undefined);
  },
};
