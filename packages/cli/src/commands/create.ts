// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok } from "@microsoft/teamsfx-api";
import { CliCommand, CliParsedCommand } from "./models";
import chalk from "chalk";

export const createCommandModel: CliCommand = {
  name: "new",
  description: "Create a new Teams application.",
  options: [
    {
      name: "capability",
      type: "singleSelect",
      shortName: "c",
      description: "Specifies the Teams App capability.",
      required: true,
      choiceListCommand: "teamsfx help --list-capabilities",
    },
    {
      name: "bot-host-type-trigger",
      type: "singleSelect",
      shortName: "t",
      description: "Specifies the trigger for `Cat Notification Messasge` app template.",
      choiceListCommand: "teamsfx help --list-notification-triggers",
    },
    {
      name: "spfx-solution",
      type: "singleSelect",
      shortName: "ss",
      description: "Create a new or import an existing SharePoint Framework solution.",
      choices: ["new", "import"],
      default: "new",
    },
    {
      name: "spfx-install-latest-package",
      shortName: "sp",
      type: "singleSelect",
      description: "Install latest SharePoint Framework version.",
      choices: [true, false],
      default: true,
    },
    {
      name: "spfx-web-part",
      type: "text",
      shortName: "sw",
      description: "Name for SharePoint Framework Web Part.",
      default: "helllworld",
    },
    {
      name: "spfx-folder",
      type: "text",
      shortName: "sf",
      description: "Directory path that contains the existing SarePoint Framework solutions.",
    },
    {
      name: "programming-language",
      type: "singleSelect",
      shortName: "l",
      description: "Programming Language.",
      choices: ["javascript", "typescript", "csharp"],
      default: "javascript",
    },
    {
      name: "folder",
      shortName: "f",
      description: "Root folder of the project.",
      type: "text",
      default: '"./"',
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
    `1. Create a new timer triggered notification bot: \n    ${chalk.blueBright(
      "teamsfx new -c notification -t timer-functions -l typescript -n myapp"
    )}`,
    `2. Import an existing SharePoint Framework solution \n    ${chalk.blueBright(
      "teamsfx new -c tab-spfx -ss import --sf <folder-path> -n myapp"
    )}`,
  ],
  handler: async (cmd: CliParsedCommand) => {
    console.log(
      `teamsfx new called with inputs: ${JSON.stringify(cmd.inputs)}, loglevel: ${
        cmd.loglevel
      }, interactive: ${cmd.interactive}}`
    );
    return ok(undefined);
  },
};
