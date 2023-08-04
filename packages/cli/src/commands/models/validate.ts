// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import {
  CoreQuestionNames,
  MissingRequiredInputError,
  ValidateTeamsAppOptions,
  validateAppPackageOption,
  validateSchemaOption,
} from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { cliSource } from "../../constants";
import { ArgumentConflictError, MissingRequiredOptionError } from "../../error";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, ProjectFolderOption } from "../common";
import { ValidateTeamsAppInputs } from "@microsoft/teamsfx-core";

export const validateCommand: CLICommand = {
  name: "validate",
  description: "Validate the Teams app using manifest schema or validation rules.",
  options: [...ValidateTeamsAppOptions, EnvOption, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.ValidateManifest,
  },
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
          new MissingRequiredInputError("manifest-path or app-package-file-path", cliSource)
        );
      }

      if (inputs["manifest-path"] && !inputs.env) {
        const error = new MissingRequiredOptionError("teamsfx validate", "env");
        return err(error);
      }

      if (inputs["app-package-file-path"]) {
        inputs[CoreQuestionNames.ValidateMethod] = validateAppPackageOption.id;
      } else {
        inputs[CoreQuestionNames.ValidateMethod] = validateSchemaOption.id;
      }
    }
    const core = createFxCore();
    const res = await core.validateApplication(inputs);
    return res;
  },
};
