// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, ok, err, Result } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";
import { MissingRequiredOptionError } from "../../error";

export const updateTeamsAppCommand: CLICommand = {
  name: "teams-app",
  description: "Update the Microsoft Teams App manifest to Teams Developer Portal.",
  options: [...SelectTeamsManifestOptions, EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateTeamsApp,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;

    const validateInputsRes = validateInputs(inputs);
    if (validateInputsRes.isErr()) {
      return err(validateInputsRes.error);
    }

    const core = getFxCore();
    const res = await core.deployTeamsManifest(inputs);
    return res;
  },
};

function validateInputs(
  inputs: InputsWithProjectPath
): Result<undefined, MissingRequiredOptionError> {
  if (inputs["manifest-path"] && !inputs.env) {
    return err(
      new MissingRequiredOptionError(`teamsfx update ${updateTeamsAppCommand.name}`, "--env")
    );
  }
  return ok(undefined);
}
