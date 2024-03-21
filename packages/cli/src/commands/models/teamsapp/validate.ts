// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, TeamsAppInputs, err } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../../activate";
import { commands } from "../../../resource";
import { TelemetryEvent } from "../../../telemetry/cliTelemetryEvents";
import {
  EnvFileOption,
  EnvOption,
  ProjectFolderOption,
  TeamsAppManifestFileOption,
  TeamsAppOuputPackageOption,
  TeamsAppOutputManifestFileOption,
  TeamsAppPackageOption,
} from "../../common";
import { validateArgumentConflict } from "./update";

export const teamsappValidateCommand: CLICommand = {
  name: "validate",
  description: commands.validate.description,
  options: [
    TeamsAppManifestFileOption,
    TeamsAppPackageOption,
    TeamsAppOuputPackageOption,
    TeamsAppOutputManifestFileOption,
    EnvOption,
    EnvFileOption,
    ProjectFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.ValidateManifest,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as TeamsAppInputs;
    const validateInputsRes = validateArgumentConflict(ctx.command.fullName, inputs);
    if (validateInputsRes.isErr()) {
      return err(validateInputsRes.error);
    }
    const core = getFxCore();
    const res = await core.validateTeamsAppCLIV3(inputs);
    return res;
  },
};
