// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { DeployAadManifestInputs, DeployAadManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const updateAadAppCommand: CLICommand = {
  name: "aad-app",
  description: "Update the AAD App in the current application.",
  options: [...DeployAadManifestOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateAadApp,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as DeployAadManifestInputs & InputsWithProjectPath;
    inputs.ignoreEnvInfo = false;
    const core = getFxCore();
    const res = await core.deployAadManifest(inputs);
    return res;
  },
};
