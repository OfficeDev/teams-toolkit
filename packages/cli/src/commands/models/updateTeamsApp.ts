// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const updateTeamsAppCommand: CLICommand = {
  name: "teams-app",
  description: "Update the Teams App manifest to Teams Developer Portal.",
  options: [...SelectTeamsManifestOptions, EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateTeamsApp,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;
    const core = getFxCore();
    const res = await core.deployTeamsManifest(inputs);
    return res;
  },
};
