#!/usr/bin/env node

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { readdirSync, readFileSync } from "fs";
import yargs from "yargs";

import { commands } from "./cmds";
import * as constants from "./constants";

/**
 * registers cli and partner commands with yargs.
 * @param yargs
 */
export function register(yargs: yargs.Argv): void {
  commands.forEach((command) => {
    yargs.command(
      command.command,
      command.description,
      command.builder.bind(command),
      command.handler.bind(command)
    );
  });
}

(async () => {
  register(yargs);
  yargs
    .options("verbose", {
      description: "Print additional information.",
      boolean: true,
      default: false
    })
    .options("debug", {
      description: "Print diagnostic information.",
      boolean: true,
      default: false
    })
    .demandCommand()
    .scriptName(constants.cliName)
    .help()
    .strict()
    .alias("help", "h")
    .alias("v", "version")
    .version()
    .epilogue(
      "For more information about the Teams Toolkit - https://aka.ms/teamsfx-learn."
    ).argv;
})();
