// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { DeployAadManifestInputs, DeployAadManifestOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";
import * as path from "path";

export const updateAadAppCommand: CLICommand = {
  name: "aad-app",
  description: "Update the Microsoft Entra App in the current application.",
  options: [...DeployAadManifestOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.UpdateAadApp,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    const inputs = ctx.optionValues as DeployAadManifestInputs & InputsWithProjectPath;
    inputs.ignoreEnvInfo = false;
    if (inputs["manifest-file-path"]) {
      if (!path.isAbsolute(inputs["manifest-file-path"])) {
        inputs["manifest-file-path"] = path.join(inputs.projectPath!, inputs["manifest-file-path"]);
      }
    }
    const core = getFxCore();
    const res = await core.deployAadManifest(inputs);
    return res;
  },
};
