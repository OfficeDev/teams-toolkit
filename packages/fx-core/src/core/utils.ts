// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";

export function isPureExistingApp(projectSettings: ProjectSettings): boolean {
  return projectSettings.solutionSettings === undefined;
}
