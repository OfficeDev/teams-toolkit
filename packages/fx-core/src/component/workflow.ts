// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Component, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { Scenarios } from "./constants";

export function getComponent(
  projectSettings: ProjectSettingsV3,
  resourceType: string
): Component | undefined {
  return projectSettings.components?.find((r) => r.name === resourceType);
}

export function getComponentByScenario(
  projectSetting: ProjectSettingsV3,
  resourceType: string,
  scenario?: Scenarios
): Component | undefined {
  return scenario
    ? projectSetting.components?.find((r) => r.name === resourceType && r.scenario === scenario)
    : getComponent(projectSetting, resourceType);
}
