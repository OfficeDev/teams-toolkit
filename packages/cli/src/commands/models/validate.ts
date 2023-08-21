// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, Result, err, ok } from "@microsoft/teamsfx-api";
import { ValidateTeamsAppInputs, ValidateTeamsAppOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { ArgumentConflictError, MissingRequiredOptionError } from "../../error";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const validateCommand: CLICommand = {
  name: "validate",
  description: "Validate the Teams app using manifest schema or validation rules.",
  options: [...ValidateTeamsAppOptions, EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.ValidateManifest,
  },
  examples: [
    {
      command: "teamsfx validate --app-package-file ./appPackage/build/appPackage.zip",
      description: "Validate the Teams application package.",
    },
  ],
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as ValidateTeamsAppInputs;
    if (!ctx.globalOptionValues.interactive) {
      const res = validateInputs(inputs);
      if (res.isErr()) {
        return err(res.error);
      }
    }
    const core = getFxCore();
    const res = await core.validateApplication(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};

function validateInputs(
  inputs: ValidateTeamsAppInputs
): Result<
  undefined,
  ArgumentConflictError | MissingRequiredOptionError | MissingRequiredOptionError
> {
  if (inputs["manifest-path"] && inputs["app-package-file-path"]) {
    const error = new ArgumentConflictError(
      "teamsfx validate",
      "teams-manifest-file",
      "app-package-file-path"
    );
    return err(error);
  } else if (!inputs["manifest-path"] && !inputs["app-package-file-path"]) {
    return err(
      new MissingRequiredOptionError(
        "teamsfx validate",
        "--teams-manifest-file or --app-package-file-path"
      )
    );
  }
  if (!inputs["app-package-file-path"] && !inputs.env) {
    return err(new MissingRequiredOptionError("teamsfx validate", "--env"));
  }
  return ok(undefined);
}
