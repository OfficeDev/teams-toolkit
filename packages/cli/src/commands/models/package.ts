// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, ProjectFolderOption } from "../common";

export const packageCommand: CLICommand = {
  name: "package",
  description: "Build your Teams app into a package for publishing.",
  options: [
    ...SelectTeamsManifestOptions,
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
    ProjectFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.Build,
  },
  handler: async (ctx: CLIContext) => {
    const core = createFxCore();
    const inputs = getSystemInputs();
    assign(inputs, ctx.optionValues);
    const res = await core.createAppPackage(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
