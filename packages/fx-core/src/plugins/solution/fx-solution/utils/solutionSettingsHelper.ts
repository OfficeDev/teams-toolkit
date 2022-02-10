// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";
import { BuiltInSolutionNames } from "../v3/constants";

export function ensureSolutionSettings(projectSettings: ProjectSettings): void {
  if (!projectSettings.solutionSettings) {
    projectSettings.solutionSettings = {
      name: BuiltInSolutionNames.azure,
      version: "3.0.0",
      capabilities: [],
      azureResources: [],
      activeResourcePlugins: [],
    };
  }
}
