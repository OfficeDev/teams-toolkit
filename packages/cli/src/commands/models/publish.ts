// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, IgnoreLoadEnvOption, ProjectFolderOption } from "../common";

export const publishCommand: CLICommand = {
  name: "publish",
  description: commands.publish.description,
  options: [EnvOption, ProjectFolderOption, IgnoreLoadEnvOption],
  telemetry: {
    event: TelemetryEvent.Publish,
  },
  defaultInteractiveOption: false,
  handler: async (ctx: CLIContext) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;
    const core = getFxCore();
    const res = await core.publishApplication(inputs);
    return res;
  },
};
