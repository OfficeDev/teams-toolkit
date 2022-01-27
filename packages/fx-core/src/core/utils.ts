// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ProjectSettings } from "@microsoft/teamsfx-api";

export function isCreatedFromExistingApp(inputs: Inputs): boolean {
  return false;
}

export function isPureExistingApp(projectSettings: ProjectSettings): boolean {
  return projectSettings.solutionSettings === undefined;
}
