#!/usr/bin/env node

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

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
      description: "Prints all necessary information.",
      boolean: true,
      default: true
    })
    .options("debug", {
      description: "Prints more information for debugging purposes.",
      boolean: true,
      default: false
    })
    .demandCommand()
    .scriptName(constants.cliName)
    .help()
    .strict()
    .alias("h", "help")
    .alias("v", "version")
    .epilogue(
      "for more information, find our manual at https://github.com/OfficeDev/TeamsFx"
    ).argv;
})();
