// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, FolderOption } from "../common";
import { CLICommand, CLIContext } from "../types";

export const packageCommand: CLICommand = {
  name: "package",
  description: "Build your Teams app into a package for publishing.",
  options: [
    {
      name: "manifest-path",
      type: "text",
      shortName: "m",
      required: true,
      description:
        "Specifies the Teams app manifest template path, defaults to '${folder}/appPackage/manifest.json'.",
    },
    {
      name: "output-zip-path",
      type: "text",
      shortName: "oz",
      description:
        "Specifies the output path of the zipped app package, defaults to '${folder}/appPackage/build/appPackage.${env}.zip'.",
    },
    {
      name: "output-manifest-path",
      type: "text",
      shortName: "om",
      description:
        "Specifies the output path of the generated manifest path, defaults to '${folder}/appPackage/build/manifest.${env}.json'",
    },
    EnvOption,
    FolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.Build,
  },
  handler: async (ctx: CLIContext) => {
    const projectPath = ctx.optionValues.folder as string;
    const core = createFxCore();
    const inputs = getSystemInputs(projectPath);
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    const res = await core.createAppPackage(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
