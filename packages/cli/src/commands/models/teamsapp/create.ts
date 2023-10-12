// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, Result, err, ok } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestInputs, SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../../activate";
import { MissingRequiredOptionError } from "../../../error";
import { TelemetryEvent } from "../../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../../common";
import * as path from "path";

export const teamsappCreateCommand: CLICommand = {
  name: "create",
  description: "Create a Microsoft Teams App in Teams Developer Portal.",
  options: [],
  telemetry: {
    event: TelemetryEvent.UpdateTeamsApp,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as SelectTeamsManifestInputs;
    if (inputs["manifest-path"]) {
      if (!path.isAbsolute(inputs["manifest-path"])) {
        inputs["manifest-path"] = path.join(inputs.projectPath!, inputs["manifest-path"]);
      }
    }
    const validateInputsRes = validateInputs(ctx.command.fullName, inputs);
    if (validateInputsRes.isErr()) {
      return err(validateInputsRes.error);
    }

    const core = getFxCore();
    const res = await core.deployTeamsManifest(inputs);
    return res;
  },
};

function validateInputs(
  fullName: string,
  inputs: SelectTeamsManifestInputs
): Result<undefined, MissingRequiredOptionError> {
  if (inputs["manifest-path"] && !inputs.env) {
    return err(new MissingRequiredOptionError(fullName, "--env"));
  }
  return ok(undefined);
}
