// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Scenarios } from "./constants";

export function getComponent(projectSettings: any, resourceType: string): any | undefined {
  return projectSettings.components?.find((r: any) => r.name === resourceType);
}

export function getComponentByScenario(
  projectSetting: any,
  resourceType: string,
  scenario?: Scenarios
): any | undefined {
  return scenario
    ? projectSetting.components?.find(
        (r: any) => r.name === resourceType && r.scenario === scenario
      )
    : getComponent(projectSetting, resourceType);
}
