// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { ValidateTeamsAppInputs, ValidateTeamsAppOptions } from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { ArgumentConflictError, MissingRequiredOptionError } from "../../error";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { ProjectFolderOption } from "../common";

export const validateCommand: CLICommand = {
  name: "validate",
  description: "Validate the Teams app using manifest schema or validation rules.",
  options: [...ValidateTeamsAppOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.ValidateManifest,
  },
  examples: [
    {
      command: "teamsfx validate --app-package-file ./appPackage/build/appPackage.zip",
      description: "Validate the Teams application package.",
    },
  ],
  handler: async (ctx) => {
    const inputs = getSystemInputs() as ValidateTeamsAppInputs;
    assign(inputs, ctx.optionValues);

    if (!ctx.globalOptionValues.interactive) {
      if (inputs["manifest-path"] && inputs["app-package-file-path"]) {
        const error = new ArgumentConflictError(
          "teamsfx validate",
          "manifest-path",
          "app-package-file-path"
        );
        return err(error);
      } else if (!inputs["manifest-path"] && !inputs["app-package-file-path"]) {
        return err(
          new MissingRequiredOptionError(
            "teamsfx validate",
            "--manifest-path or --app-package-file-path"
          )
        );
      }
      if (!inputs["app-package-file-path"] && !inputs.env) {
        return err(new MissingRequiredOptionError("teamsfx validate", "--env"));
      }
    }
    const core = createFxCore();
    const res = await core.validateApplication(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
