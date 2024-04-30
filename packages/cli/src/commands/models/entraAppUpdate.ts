// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, Inputs } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EntraAppManifestFileOption, EnvOption, ProjectFolderOption } from "../common";

export const entraAppUpdateCommand: CLICommand = {
  name: "update",
  description: commands["entra-app.update"].description,
  options: [EntraAppManifestFileOption, EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateAadApp,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues;
    inputs.ignoreEnvInfo = false;
    const core = getFxCore();
    const res = await core.deployAadManifest(inputs as Inputs);
    return res;
  },
};

export const entraAppCommand: CLICommand = {
  name: "entra-app",
  description: commands["entra-app"].description,
  commands: [entraAppUpdateCommand],
};
