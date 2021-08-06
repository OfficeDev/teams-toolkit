// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { registerCommands } from "./cmds";
import * as constants from "./constants";
import { registerPrompts } from "./prompts";
import HelpParamGenerator from "./helpParamGenerator";
import { getVersion } from "./utils";

function changeArgv(argv: string[]): string[] {
  return argv.map((s) => (s.startsWith("--") ? s.toLocaleLowerCase() : s));
}

/**
 * Starts the CLI process.
 */
export async function start() {
  registerPrompts();
  await HelpParamGenerator.initializeQuestionsForHelp();
  const argv = yargs(changeArgv(hideBin(process.argv))).parserConfiguration({
    "parse-numbers": false,
    "camel-case-expansion": false,
  });
  registerCommands(argv);
  argv
    .options("verbose", {
      description: "Print additional information.",
      boolean: true,
      default: false,
    })
    .options("debug", {
      description: "Print diagnostic information.",
      boolean: true,
      default: false,
    })
    .demandCommand()
    .scriptName(constants.cliName)
    .help()
    .strict()
    .showHelpOnFail(false, "Specify --help for available options")
    .alias("help", "h")
    .alias("v", "version")
    .version(getVersion())
    .wrap(Math.min(100, yargs.terminalWidth()))
    .epilogue("For more information about the Teams Toolkit - https://aka.ms/teamsfx-learn.").argv;
}
