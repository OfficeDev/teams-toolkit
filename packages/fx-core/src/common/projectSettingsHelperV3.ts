// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { AzureResources, ComponentNames } from "../component/constants";
import { getComponent } from "../component/workflow";

export function validateProjectSettings(projectSettings: ProjectSettingsV3): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  const components = projectSettings.components;
  if (!components) return "components is undefined";
  return undefined;
}

export function hasTab(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.TeamsTab).length > 0;
}
export function hasAzureTab(projectSettings: ProjectSettingsV3): boolean {
  const tab = getComponent(projectSettings, ComponentNames.TeamsTab);
  return tab !== undefined && tab.hosting !== ComponentNames.SPFx;
}
export function hasBot(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.TeamsBot).length > 0;
}
export function hasFunctionBot(projectSettings: ProjectSettingsV3): boolean {
  const botComponent = getComponent(projectSettings, ComponentNames.TeamsBot);
  if (!botComponent) return false;
  return botComponent.hosting === ComponentNames.Function;
}
export function hasAAD(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.AadApp).length > 0;
}
export function hasApi(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.TeamsApi).length > 0;
}
export function hasSimpleAuth(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.SimpleAuth).length > 0;
}
export function hasAzureResourceV3(projectSetting: ProjectSettingsV3, excludeAad = false): boolean {
  const filtered = projectSetting.components?.filter(
    (c) => AzureResources.includes(c.name) || (!excludeAad && c.name === ComponentNames.AadApp)
  );
  return filtered.length > 0;
}
export function hasSPFxTab(projectSetting: ProjectSettingsV3): boolean {
  const tab = getComponent(projectSetting, ComponentNames.TeamsTab);
  return tab?.hosting === ComponentNames.SPFx;
}
export function hasAPIM(projectSettings: ProjectSettingsV3): boolean {
  return getComponent(projectSettings, ComponentNames.APIM) !== undefined;
}
export function hasKeyVault(projectSettings: ProjectSettingsV3): boolean {
  return getComponent(projectSettings, ComponentNames.KeyVault) !== undefined;
}
export function hasSQL(projectSettings: ProjectSettingsV3): boolean {
  return getComponent(projectSettings, ComponentNames.AzureSQL) !== undefined;
}
export function isMiniApp(projectSettings: ProjectSettingsV3): boolean {
  if (!projectSettings.components || projectSettings.components.length === 0) return true;
  // Scenario: SSO is added to existing tab app
  if (projectSettings.components.length === 1 && hasAAD(projectSettings)) {
    return true;
  }
  return false;
}
