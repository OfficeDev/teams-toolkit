// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok } from "@microsoft/teamsfx-api";
import { CliCommand } from "./models";
import chalk from "chalk";

export const createCommandModel: CliCommand = {
  name: "new",
  description: "Create a new Teams application.",
  handler: async (args) => {
    console.log(`teamsfx new called with args: ${args}`);
    return ok(undefined);
  },
  options: [
    {
      name: "capability",
      type: "singleSelect",
      shortName: "c",
      description: "Application capability",
      required: true,
      choices: ["tab", "bot"],
      choiceListCommand: "teamsfx list capability",
    },
    {
      name: "app-name",
      shortName: "n",
      description: "Application name",
      type: "text",
      required: true,
    },
  ],
  examples: [
    `1. Create a basic bot app in current folder: \n    ${chalk.blueBright(
      "teamsfx new -c bot -l typescript -f . -n myapp"
    )}`,
    `2. Create a notification bot with http restify trigger using javascript in current folder: \n    ${chalk.blueBright(
      "teamsfx new -c notification -t http-restify -l javascript -f . -n myapp"
    )}`,
  ],
};
