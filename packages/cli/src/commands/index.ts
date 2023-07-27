// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Command } from "commander";
import { FooterText } from "../constants";
import { getVersion } from "../utils";
import { createCommandModel } from "./create";
import { compareOptions, createCommand, createOption } from "./utils";

const program = new Command();

program
  .configureHelp({
    showGlobalOptions: true,
    sortOptions: true,
    sortSubcommands: true,
    visibleOptions: (cmd) => {
      let res = cmd.options.filter((option) => !option.hidden);
      res.push(cmd.createOption("--help -h", "Show help message."));
      res = res.sort(compareOptions);
      return res;
    },
  })
  .addHelpText("after", FooterText)
  .name("teamsfx")
  .description("")
  .option("--debug", "Print debug information.")
  .option("--verbose", "Print diagnostic information.")
  .version(getVersion(), "--version -v", "Show version number.")
  .addOption(
    createOption({
      type: "text",
      name: "interactive",
      shortName: "i",
      description: "Run the command in interactive mode.",
      default: "true",
    })
  )
  .addHelpCommand(false)
  .helpOption("--help -h", "Show help message.");

program.addCommand(createCommand(createCommandModel, program));
program.parse();
