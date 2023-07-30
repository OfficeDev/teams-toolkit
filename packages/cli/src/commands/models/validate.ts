// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok } from "@microsoft/teamsfx-api";
import {
  CoreQuestionNames,
  MissingRequiredInputError,
  validateAppPackageOption,
  validateSchemaOption,
} from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { cliSource } from "../../constants";
import { ArgumentConflictError, MissingRequiredArgumentError } from "../../error";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, FolderOption } from "../common";
import { CLICommand } from "../types";

export const validateCommand: CLICommand = {
  name: "validate",
  description: "Validate the Teams app using manifest schema or validation rules.",
  options: [
    {
      name: "manifest-path",
      type: "text",
      default: "./appPackage/manifest.json",
      description:
        "Specifies the input Teams app manifest file path. This manifest will be validated using manifest schema.",
    },
    {
      name: "app-package-file-path",
      type: "text",
      description:
        "Specifies the zipped Teams app package path. Default value: '${folder}/appPackage/build/appPackage.${env}.zip'. This package will be validated with validation rules.",
    },
    EnvOption,
    FolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.ValidateManifest,
  },
  handler: async (ctx) => {
    const inputs = getSystemInputs();
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }

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
        const error = new MissingRequiredArgumentError("teamsfx validate", "env");
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
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
