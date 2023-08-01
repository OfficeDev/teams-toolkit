// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { CreateSampleProjectArguments, CreateSampleProjectInputs } from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { createFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { RootFolderOption } from "../common";

export const createSampleCommand: CLICommand = {
  name: "sample",
  description: "Create an app from existing sample.",
  arguments: CreateSampleProjectArguments,
  options: [RootFolderOption],
  telemetry: {
    event: TelemetryEvent.DownloadSample,
  },
  handler: async (cmd: CLIContext) => {
    const sampleName = cmd.argumentValues?.[0];
    const inputs = getSystemInputs() as CreateSampleProjectInputs;
    assign(inputs, cmd.optionValues);
    inputs.samples = sampleName as any;
    inputs.projectId = inputs.projectId ?? uuid.v4();
    const core = createFxCore();
    const res = await core.createSampleProject(inputs);
    assign(cmd.telemetryProperties, {
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.SampleName]: inputs.samples,
    });
    if (res.isErr()) {
      return err(res.error);
    }
    logger.info(
      `Sample project '${chalk.white(inputs.samples)}' downloaded at: ${chalk.cyanBright(
        res.value
      )}`
    );
    return ok(undefined);
  },
};
