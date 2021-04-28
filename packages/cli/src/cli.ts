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

  version += "built with ";
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
      description: "Print verbose logging",
      boolean: true,
      default: false
    })
    .options("debug", {
      description: "Print debug logging",
      boolean: true,
      default: false
    })
    .demandCommand()
    .scriptName(constants.cliName)
    .help()
    .strict()
    .alias("help", "h")
    .alias("v", "version")
    .version(getVersionString())
    .epilogue(
      "For more information, documentation is available at http://aka.ms/teamsfx-docs"
    ).argv;
})();
