// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import yargs, { Argv } from "yargs";
import { AadManager, ResourceGroupManager } from "fx-api";

import GraphTokenProvider from "../../src/commonlib/graphLogin";

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

      if (type === "aad") {
        const aadManager = await AadManager.init(GraphTokenProvider);
        await aadManager.deleteAadApps(contains, hours);
      } else {
        const rgManager = await ResourceGroupManager.init();
        const groups = await rgManager.searchResourceGroups(contains);
        const filteredGroups = hours && hours > 0
          ? groups.filter(group => {
              const name = group.name!;
              const startPos = name.indexOf(contains) + contains.length;
              const createdTime = Number(name.slice(startPos, startPos + 13));
              return Date.now() - createdTime > hours * 3600 * 1000;
            })
          : groups;

        for (const rg of filteredGroups) {
          const result = await rgManager.deleteResourceGroup(rg.name!);
          if (result) {
            console.log(`[Successfully] clean up the Azure resource group with name: ${rg.name}.`);
          } else {
            console.error(`[Faild] clean up the Azure resource group with name: ${rg.name}.`);
          }
        }
      }
    }
  )
  .demandCommand()
  .help()
  .strict()
  .alias("help", "h")
  .argv;
