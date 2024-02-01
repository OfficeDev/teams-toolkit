// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestInputs, SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const packageCommand: CLICommand = {
  name: "package",
  description: "Build your Microsoft Teams app into a package for publishing.",
  options: [
    ...SelectTeamsManifestOptions,
    {
      name: "output-zip-path",
      type: "string",
      shortName: "oz",
      description:
        "Specifies the output path of the zipped app package, defaults to '${folder}/appPackage/build/appPackage.${env}.zip'.",
    },
    {
      name: "output-manifest-path",
      type: "string",
      shortName: "om",
      description:
        "Specifies the output path of the generated manifest path, defaults to '${folder}/appPackage/build/manifest.${env}.json'",
    },
    EnvOption,
    ProjectFolderOption,
  ],
  defaultInteractiveOption: false,
  telemetry: {
    event: TelemetryEvent.Build,
  },
  handler: async (ctx: CLIContext) => {
    const core = getFxCore();
    const inputs = ctx.optionValues as SelectTeamsManifestInputs & InputsWithProjectPath;
    const res = await core.createAppPackage(inputs);
    return res;
  },
};
