// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, TeamsAppInputs } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../../activate";
import { commands } from "../../../resource";
import { TelemetryEvent } from "../../../telemetry/cliTelemetryEvents";
import {
  EnvFileOption,
  EnvOption,
  ProjectFolderOption,
  TeamsAppManifestFileOption,
  TeamsAppOuputPackageOption,
  TeamsAppOutputFolderOption,
} from "../../common";

export const teamsappPackageCommand: CLICommand = {
  name: "package",
  description: commands.package.description,
  options: [
    TeamsAppManifestFileOption,
    TeamsAppOuputPackageOption,
    TeamsAppOutputFolderOption,
    EnvOption,
    EnvFileOption,
    ProjectFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.Build,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as TeamsAppInputs;
    const core = getFxCore();
    const res = await core.packageTeamsAppCLIV3(inputs);
    return res;
  },
};
