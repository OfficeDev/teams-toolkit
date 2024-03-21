// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { SelectTeamsManifestInputs, SelectTeamsManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";

export const packageCommand: CLICommand = {
  name: "package",
  description: commands.package.description,
  options: [
    ...SelectTeamsManifestOptions,
    {
      name: "output-zip-path",
      type: "string",
      shortName: "oz",
      description: commands.package.options["output-zip-path"],
    },
    {
      name: "output-manifest-path",
      type: "string",
      shortName: "om",
      description: commands.package.options["output-manifest-path"],
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
