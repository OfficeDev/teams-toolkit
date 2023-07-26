// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Command } from "commander";
import { FooterText } from "../constants";
import { getVersion } from "../utils";
import { createCommandModel } from "./create";
import { createCommand } from "./utils";

const program = new Command();

program
  .configureHelp({ showGlobalOptions: true })
  .addHelpText("after", FooterText)
  .name("teamsfx")
  .description("")
  .version(getVersion(), "--version, -v", "Show version number")
  .option("--verbose", "Print diagnostic logs")
  .option("--debug", "Print debug logs")
  .addHelpCommand(false)
  .helpOption("--help, -h", "Show help");

program.addCommand(createCommand(createCommandModel));

program.parse();
