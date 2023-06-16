// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../component/constants";
import { getComponent } from "../component/workflow";

export function hasFunctionBot(projectSettings: ProjectSettingsV3): boolean {
  const botComponent = getComponent(projectSettings, ComponentNames.TeamsBot);
  if (!botComponent) return false;
  return botComponent.hosting === ComponentNames.Function;
}
export function hasAAD(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.AadApp).length > 0;
}

export function hasAzureResourceV3(projectSetting: ProjectSettingsV3, excludeAad = false): boolean {
  return false;
}
export function hasSPFxTab(projectSetting: ProjectSettingsV3): boolean {
  return false;
}
