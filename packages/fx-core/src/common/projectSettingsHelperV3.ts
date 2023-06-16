// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ComponentNames } from "../component/constants";
import { getComponent } from "../component/workflow";

export function hasFunctionBot(projectSettings: any): boolean {
  const botComponent = getComponent(projectSettings, ComponentNames.TeamsBot);
  if (!botComponent) return false;
  return botComponent.hosting === ComponentNames.Function;
}
export function hasAAD(projectSettings: any): boolean {
  const components = projectSettings.components;
  return components.filter((c: any) => c.name === ComponentNames.AadApp).length > 0;
}

export function hasAzureResourceV3(projectSetting: any, excludeAad = false): boolean {
  return false;
}
export function hasSPFxTab(projectSetting: any): boolean {
  return false;
}
