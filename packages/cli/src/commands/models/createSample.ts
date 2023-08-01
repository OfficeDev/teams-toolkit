// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import {
  CoreQuestionNames,
  CreateSampleProjectArguments,
  ScratchOptions,
} from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { createFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { RootFolderOption } from "../common";
import { listSampleCommand } from "./listSamples";

export const createSampleCommand: CLICommand = {
  name: "template",
  description: "Create a new Teams application from a sample.",
  arguments: CreateSampleProjectArguments,
  options: [RootFolderOption],
  telemetry: {
    event: TelemetryEvent.DownloadSample,
  },
  commands: [listSampleCommand],
  handler: async (cmd: CLIContext) => {
    const sampleName = cmd.argumentValues?.[0] || "";
    const inputs = getSystemInputs();
    inputs.projectId = inputs.projectId ?? uuid.v4();
    inputs[CoreQuestionNames.Scratch] = ScratchOptions.no().id;
    inputs[CoreQuestionNames.Samples] = sampleName;
    const folderOption = cmd.command.options?.find((o) => o.name === "folder");
    inputs[CoreQuestionNames.Folder] = folderOption?.value || folderOption?.default || "./";
    const core = createFxCore();
    const res = await core.createProject(inputs);
    assign(cmd.telemetryProperties, {
      [TelemetryProperty.NewProjectId]: inputs.projectId,
      [TelemetryProperty.SampleName]: sampleName,
    });
    if (res.isErr()) {
      return err(res.error);
    }
    logger.info(
      `Sample project '${chalk.white(sampleName)}' downloaded at: ${chalk.cyanBright(res.value)}`
    );
    return ok(undefined);
  },
};
