// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, LogLevel, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { createFxCore } from "../activate";
import { templates } from "../constants";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import { getSystemInputs, toLocaleLowerCase } from "../utils";
import { listSampleCommandModel } from "./listSamples";
import { CliCommand, CliCommandWithContext } from "./models";
import * as uuid from "uuid";
import CLILogProvider from "../commonlib/log";
import chalk from "chalk";
import { CoreQuestionNames, ScratchOptions } from "../../../fx-core/build";

export const createSampleCommand: CliCommand = {
  name: "template",
  description: "Create a new Teams application from a sample.",
  arguments: [
    {
      name: "sample-name",
      type: "singleSelect",
      description: "Specifies the Teams App sample name.",
      required: true,
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
      required: true,
      default: "./",
    },
  ],
  handler: async (cmd: CliCommandWithContext) => {
    // const inputs = getSystemInputs();
    // assign(inputs, cmd.inputs);
    // inputs.projectId = inputs.projectId ?? uuid.v4();
    // inputs[CoreQuestionNames.Scratch] = ScratchOptions.no().id;
    // const core = createFxCore();
    // const res = await core.createProject(inputs);
    // assign(cmd.telemetryProperties, {
    //   [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    //   [TelemetryProperty.NewProjectId]: inputs.projectId,
    //   // [TelemetryProperty.SampleName]: templateName,
    // });
    // if (res.isErr()) {
    //   return err(res.error);
    // }
    // CLILogProvider.necessaryLog(
    //   LogLevel.Info,
    //   `Sample project '${CLILogProvider.white(templateName)}' downloaded at: ${chalk.cyanBright(res.value)}`
    // );
    return ok(undefined);
  },
  telemetry: {
    event: TelemetryEvent.DownloadSample,
  },
  commands: [listSampleCommandModel],
};
