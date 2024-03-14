// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const cleanCommand: CLICommand = {
  name: "clean",
  description: "clean up resources create by Teams Toolkit",
  options: [EnvOption, ProjectFolderOption],
  defaultInteractiveOption: false,
  telemetry: {
    event: TelemetryEvent.Clean,
  },
  handler: async (ctx: CLIContext) => {
    const core = getFxCore();
    const inputs = ctx.optionValues as InputsWithProjectPath;
    const res = await core.clean(inputs);
    return res;
  },
};
