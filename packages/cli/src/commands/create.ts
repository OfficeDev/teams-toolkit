// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogLevel, ok } from "@microsoft/teamsfx-api";
import { CliCommand, CliCommandWithContext } from "./models";
import chalk from "chalk";
import { templates } from "../constants";
import { getSystemInputs, toLocaleLowerCase } from "../utils";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/cliTelemetryEvents";
import CLILogProvider from "../commonlib/log";

export const listSampleCommandModel: CliCommand = {
  name: "list",
  description: "List all Teams App samples.",
  handler: async (cmd: CliCommandWithContext) => {
    CLILogProvider.necessaryLog(LogLevel.Info, `The following are sample apps:`);
    CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(templates, undefined, 4), true);
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.ListSample,
  },
};

export const createSampleCommand: CliCommand = {
  name: "template",
  description: "Create a new Teams application from a sample.",
  arguments: [
    {
      name: "sample-name",
      type: "singleSelect",
      description: "Specifies the Teams App sample name.",
      choices: templates.map((t) => toLocaleLowerCase(t.sampleAppName)),
      choiceListCommand: "teamsfx new template list",
    },
  ],
  options: [
    {
      name: "folder",
      shortName: "f",
      description: "Root folder of the project.",
      type: "text",
      default: '"./"',
    },
  ],
  handler: async (cmd: CliCommandWithContext) => {
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.DownloadSample,
  },
  commands: [listSampleCommandModel],
};

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
  handler: async (cmd: CliCommandWithContext) => {
    console.log(
      `teamsfx new called with inputs: ${JSON.stringify(cmd.inputs)}, loglevel: ${
        cmd.loglevel
      }, interactive: ${cmd.interactive}`
    );
    const inputs = getSystemInputs();
    //TODO Call FxCore
    cmd.telemetryProperties[TelemetryProperty.IsCreatingM365] = inputs.isM365 + "";
    return ok(undefined);
  },
  commands: [createSampleCommand],
  telemetry: {
    event: TelemetryEvent.CreateProject,
  },
};
