// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, Result, TeamsAppInputs, err, ok } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../../activate";
import { ArgumentConflictError } from "../../../error";
import { commands } from "../../../resource";
import { TelemetryEvent } from "../../../telemetry/cliTelemetryEvents";
import {
  EnvFileOption,
  EnvOption,
  ProjectFolderOption,
  TeamsAppManifestFileOption,
  TeamsAppOuputPackageOption,
  TeamsAppOutputFolderOption,
  TeamsAppPackageOption,
} from "../../common";

export const teamsappUpdateCommand: CLICommand = {
  name: "update",
  description: commands.update.description,
  options: [
    TeamsAppManifestFileOption,
    TeamsAppPackageOption,
    TeamsAppOuputPackageOption,
    TeamsAppOutputFolderOption,
    EnvOption,
    EnvFileOption,
    ProjectFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.UpdateTeamsApp,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as TeamsAppInputs;
    const validateInputsRes = validateArgumentConflict(ctx.command.fullName, inputs);
    if (validateInputsRes.isErr()) {
      return err(validateInputsRes.error);
    }

    const core = getFxCore();
    const res = await core.updateTeamsAppCLIV3(inputs);
    return res;
  },
};

export function validateArgumentConflict(
  fullName: string,
  inputs: TeamsAppInputs
): Result<undefined, ArgumentConflictError> {
  if (inputs["manifest-file"] && inputs["package-file"]) {
    return err(new ArgumentConflictError(fullName, "--manifest-file", "--package-file"));
  }
  return ok(undefined);
}
