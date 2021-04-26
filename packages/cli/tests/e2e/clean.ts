// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import yargs, { Argv } from "yargs";

import { cleanUpResourcesCreatedHoursAgo } from "./commonUtils";

yargs
  .command(
    "clean <type>",
    "clean up resources",
    async (yargs: Argv) => {
      yargs
        .positional("type", {
          description: "clean up aad app or resource groups",
          type: "string",
          choices: ["aad", "rg"],
        })
        .options("contains", {
          description: "which string do your resource names have?",
          default: "teamsfxE2E",
          type: "string"
        })
        .options("hours", {
          description: "If set this option, it will only clean up resources created $hours ago",
          type: "number"
        });
    },
    async (args: { type: "aad" | "rg", contains: string, hours?: number }) => {
      const type = args.type;
      const contains = args.contains;
      const hours = args.hours;
      await cleanUpResourcesCreatedHoursAgo(type, contains, hours, 2);
    }
  )
  .demandCommand()
  .help()
  .strict()
  .alias("help", "h")
  .argv;
