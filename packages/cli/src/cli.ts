#!/usr/bin/env node

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { readdirSync, readFileSync } from "fs";
import yargs from "yargs";

import { commands } from "./cmds";
import * as constants from "./constants";
import path from "path";

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

function getVersionString(): string {
  let version = "teamsfx-cli: ";
  let json = JSON.parse(readFileSync(path.join(__dirname, "/../package.json"), "utf8"));
  version += json.version;
  version += "\n";

  version += "build with ";
  const dirs = readdirSync(path.join(__dirname + "/../node_modules"));
  const api = dirs.find((dir) => dir === "fx-api");
  json = JSON.parse(readFileSync(path.join(__dirname, "/../node_modules/" + api + "/package.json"), "utf8"));
  version += api + ": " + json.version + ", ";

  const core = dirs.find((dir) => dir === "fx-core");
  json = JSON.parse(readFileSync(path.join(__dirname, "/../node_modules/" + core + "/package.json"), "utf8"));
  version += core + ": " + json.version;

  return version;
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
    .version(getVersionString())
    .epilogue(
      "for more information, find our manual at https://github.com/OfficeDev/TeamsFx"
    ).argv;
})();
