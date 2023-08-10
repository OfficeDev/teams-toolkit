// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { CreateProjectInputs, CreateProjectOptions } from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { createFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { createSampleCommand } from "./createSample";

export const createCommand: CLICommand = {
  name: "new",
  description: "Create a new Teams application.",
  options: [...CreateProjectOptions],
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
  handler: async (ctx: CLIContext) => {
    const inputs = ctx.optionValues as CreateProjectInputs;
    inputs.projectId = inputs.projectId ?? uuid.v4();
    const core = createFxCore();
    const res = await core.createProject(inputs);
    assign(ctx.telemetryProperties, {
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.IsCreatingM365]: inputs.isM365 + "",
    });
    if (res.isErr()) {
      return err(res.error);
    }
    logger.info(`Project created at: ${chalk.cyanBright(res.value.projectPath)}`);
    return ok(undefined);
  },
};
