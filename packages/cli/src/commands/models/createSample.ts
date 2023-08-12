// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import {
  CreateSampleProjectArguments,
  CreateSampleProjectInputs,
  CreateSampleProjectOptions,
} from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { getFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";

export const createSampleCommand: CLICommand = {
  name: "sample",
  description: "Create an app from existing sample.",
  arguments: CreateSampleProjectArguments,
  options: CreateSampleProjectOptions,
  telemetry: {
    event: TelemetryEvent.DownloadSample,
  },
  handler: async (ctx: CLIContext) => {
    const inputs = ctx.optionValues as CreateSampleProjectInputs;
    inputs.projectId = inputs.projectId ?? uuid.v4();
    const core = getFxCore();
    const res = await core.createSampleProject(inputs);
    assign(ctx.telemetryProperties, {
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.SampleName]: inputs.samples,
    });
    if (res.isErr()) {
      return err(res.error);
    }
    logger.info(
      `Sample project '${chalk.white(inputs.samples)}' downloaded at: ${chalk.cyanBright(
        res.value.projectPath
      )}`
    );
    return ok(undefined);
  },
};
