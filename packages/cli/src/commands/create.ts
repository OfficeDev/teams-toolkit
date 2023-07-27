// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, LogLevel, ok } from "@microsoft/teamsfx-api";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { createFxCore } from "../activate";
import CLILogProvider from "../commonlib/log";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../utils";
import { createSampleCommand } from "./createSample";
import { CliCommand, CliCommandWithContext } from "./models";

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
      choices: [
        "bot",
        "notification",
        "command-bot",
        "workflow-bot",
        "tab-non-sso",
        "sso-launch-page",
        "dashboard-tab",
        "tab-spfx",
        "link-unfurling",
        "search-app",
      ],
      choiceListCommand: "teamsfx help --list-capabilities",
    },
    {
      name: "bot-host-type-trigger",
      type: "singleSelect",
      shortName: "t",
      description: "Specifies the trigger for `Chat Notification Message` app template.",
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
      required: true,
      default: "./",
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
  commands: [createSampleCommand],
  telemetry: {
    event: TelemetryEvent.CreateProject,
  },
  handler: async (cmd: CliCommandWithContext) => {
    const inputs = getSystemInputs();
    if (!cmd.interactive) assign(inputs, cmd.inputs);
    inputs.projectId = inputs.projectId ?? uuid.v4();
    const core = createFxCore();
    const res = await core.createProject(inputs);
    assign(cmd.telemetryProperties, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.IsCreatingM365]: inputs.isM365 + "",
    });
    if (res.isErr()) {
      return err(res.error);
    }
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      `Project created at: ${chalk.cyanBright(res.value)}`
    );
    return ok(undefined);
  },
};
