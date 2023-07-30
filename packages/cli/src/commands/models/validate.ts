// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { ManifestValidate } from "../../cmds/validate";
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
    const cmd = new ManifestValidate();
    const res = await cmd.runCommand(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
