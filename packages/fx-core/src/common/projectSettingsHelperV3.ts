// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  ConfigFolderName,
  ProjectSettings,
  ProjectSettingsFileName,
  ProjectSettingsV3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import {
  BotOptionItem,
  MessageExtensionItem,
  TabSsoItem,
  BotSsoItem,
  TabOptionItem,
  TabSPFxItem,
} from "../plugins/solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../plugins/solution/fx-solution/v3/constants";
import * as uuid from "uuid";
import { isAadManifestEnabled } from "./tools";
import { ComponentNames } from "../component/constants";
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
export function hasBot(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.TeamsBot).length > 0;
}
export function hasFunctionBot(projectSettings: ProjectSettingsV3): boolean {
  const botComponent = getComponent(projectSettings, ComponentNames.TeamsBot);
  if (!botComponent) return false;
  return botComponent.hosting === ComponentNames.AzureFunction;
}
export function hasAAD(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.AadApp).length > 0;
}
export function hasFunction(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.FunctionCode).length > 0;
}
export function hasSimpleAuth(projectSettings: ProjectSettingsV3): boolean {
  const components = projectSettings.components;
  return components.filter((c) => c.name === ComponentNames.SimpleAuth).length > 0;
}
export function hasAzureResourceV3(projectSetting: ProjectSettingsV3, excludeAad = false): boolean {
  const azureResources = [
    ComponentNames.APIM,
    ComponentNames.AzureWebApp,
    ComponentNames.AzureFunction,
    ComponentNames.Identity,
    ComponentNames.KeyVault,
    ComponentNames.AzureSQL,
    ComponentNames.AzureStorage,
  ];
  if (!excludeAad) {
    azureResources.push(ComponentNames.AadApp);
  }
  const filtered = projectSetting.components.filter((c) => azureResources.includes(c.name));
  return filtered.length > 0;
}
