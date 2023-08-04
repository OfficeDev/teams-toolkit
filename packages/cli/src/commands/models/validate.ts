// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err } from "@microsoft/teamsfx-api";
import {
  CoreQuestionNames,
  MissingRequiredInputError,
  ValidateTeamsAppInputs,
  ValidateTeamsAppOptions,
  validateAppPackageOption,
  validateSchemaOption,
} from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { cliSource } from "../../constants";
import { ArgumentConflictError } from "../../error";
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
