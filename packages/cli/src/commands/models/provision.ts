// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { createFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const provisionCommand: CLICommand = {
  name: "provision",
  description: strings.command.provision.description,
  options: [EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.Provision,
  },
  handler: async (ctx: CLIContext) => {
    const core = createFxCore();
    const inputs = ctx.optionValues as InputsWithProjectPath;
    const res = await core.provisionResources(inputs);
    return res;
  },
};
