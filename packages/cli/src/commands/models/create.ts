// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, Platform, err, ok } from "@microsoft/teamsfx-api";
import { CreateProjectOptions, CreateProjectInputs } from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { createFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { RootFolderOption } from "../common";
import { createSampleCommand } from "./createSample";

const options = CreateProjectOptions.filter((option) =>
  [
    "capability",
    "bot-host-type-trigger",
    "spfx-solution",
    "spfx-install-latest-package",
    "spfx-framework-type",
    "spfx-webpart-name",
    "spfx-folder",
    "programming-language",
    "app-name",
  ].includes(option.name)
);
export const createCommand: CLICommand = {
  name: "new",
  description: "Create a new Teams application.",
  options: [...options, RootFolderOption],
  examples: [
    {
      command: "teamsfx new -c notification -t timer-functions -l typescript -n myapp",
      description: "Create a new timer triggered notification bot",
    },
    {
      command: "teamsfx new -c tab-spfx -ss import --sf <folder-path> -n myapp",
      description: "Import an existing SharePoint Framework solution",
    },
  ],
  commands: [createSampleCommand],
  telemetry: {
    event: TelemetryEvent.CreateProject,
  },
  handler: async (cmd: CLIContext) => {
    const inputs = getSystemInputs();
    assign(inputs, cmd.optionValues);
    inputs.projectId = inputs.projectId ?? uuid.v4();
    const core = createFxCore();
    const res = await core.createProject(inputs);
    assign(cmd.telemetryProperties, {
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.IsCreatingM365]: inputs.isM365 + "",
    });
    if (res.isErr()) {
      return err(res.error);
    }
    logger.info(`Project created at: ${chalk.cyanBright(res.value)}`);
    return ok(undefined);
  },
};
