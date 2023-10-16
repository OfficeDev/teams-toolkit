// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, TeamsAppInputs } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../../activate";
import { TelemetryEvent } from "../../../telemetry/cliTelemetryEvents";
import {
  EnvFileOption,
  EnvOption,
  ProjectFolderOption,
  TeamsAppManifestFileOption,
  TeamsAppOuputPackageOption,
  TeamsAppOutputManifestFileOption,
} from "../../common";

export const teamsappPackageCommand: CLICommand = {
  name: "packagev3",
  description: "Build your Microsoft Teams app into a package for publishing.",
  options: [
    TeamsAppManifestFileOption,
    TeamsAppOuputPackageOption,
    TeamsAppOutputManifestFileOption,
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
