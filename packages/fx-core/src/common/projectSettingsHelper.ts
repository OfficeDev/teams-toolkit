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
import { ComponentNames } from "../component/constants";

export function validateProjectSettings(projectSettings: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return undefined;
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  let validateRes = validateStringArray(solutionSettings.azureResources);
  if (validateRes) {
    return `solutionSettings.azureResources validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.capabilities, [
    TabOptionItem.id,
    BotOptionItem.id,
    MessageExtensionItem.id,
    TabSPFxItem.id,
    TabSsoItem.id,
    BotSsoItem.id,
  ]);
  if (validateRes) {
    return `solutionSettings.capabilities validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.activeResourcePlugins);
  if (validateRes) {
    return `solutionSettings.activeResourcePlugins validation failed: ${validateRes}`;
  }

  if (projectSettings?.solutionSettings?.migrateFromV1) {
    return "The project created before v2.0.0 is only supported in the Teams Toolkit before v3.4.0.";
  }

  return undefined;
}

function validateStringArray(arr?: any, enums?: string[]) {
  if (!arr) {
    return "is undefined";
  }
  if (!Array.isArray(arr)) {
    return "is not array";
  }
  for (const element of arr as any[]) {
    if (typeof element !== "string") {
      return "array elements is not string type";
    }
    if (enums && !enums.includes(element)) {
      return `array elements is out of scope: ${enums}`;
    }
  }
  return undefined;
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`, "configs");
    const settingsFile = path.resolve(confFolderPath, ProjectSettingsFileName);
    const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
    if (validateProjectSettings(projectSettings)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function hasAAD(projectSetting: ProjectSettings): boolean {
  const solutionSettings = projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  if (!solutionSettings) return false;
  return solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.aad);
}

export function hasSPFx(projectSetting: ProjectSettings): boolean {
  const solutionSettings = projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  if (!solutionSettings) return false;
  return solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.spfx);
}

export function hasAzureResource(projectSetting: ProjectSettings, excludeAad = false): boolean {
  const solutionSettings = projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  if (!solutionSettings) return false;
  const azurePlugins = [
    BuiltInFeaturePluginNames.apim,
    BuiltInFeaturePluginNames.bot,
    BuiltInFeaturePluginNames.frontend,
    BuiltInFeaturePluginNames.function,
    BuiltInFeaturePluginNames.identity,
    BuiltInFeaturePluginNames.keyVault,
    BuiltInFeaturePluginNames.simpleAuth,
    BuiltInFeaturePluginNames.sql,
  ];
  if (!excludeAad) {
    azurePlugins.push(BuiltInFeaturePluginNames.aad);
  }
  for (const pluginName of solutionSettings.activeResourcePlugins) {
    if (azurePlugins.includes(pluginName)) return true;
  }
  return false;
}

export function hasAzureResourceV3(projectSetting: ProjectSettingsV3, excludeAad = false): boolean {
  const azureResources = [
    ComponentNames.apim,
    ComponentNames.webApp,
    ComponentNames.function,
    ComponentNames.identity,
    ComponentNames.keyVault,
    ComponentNames.sql,
    ComponentNames.storage,
  ];
  if (!excludeAad) {
    azureResources.push(ComponentNames.aad);
  }
  const filtered = projectSetting.components.filter((c) => azureResources.includes(c.name));
  return filtered.length > 0;
}

export function isExistingTabApp(projectSettings: ProjectSettings): boolean {
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if (!solutionSettings) {
    return true;
  }

  // Scenario: SSO is added to existing tab app
  if (
    solutionSettings.capabilities?.length === 1 &&
    solutionSettings.capabilities.includes(TabSsoItem.id)
  ) {
    return true;
  }

  return false;
}

export function getProjectSettingsVersion() {
  return "2.1.0";
}

export function newProjectSettings(): ProjectSettings {
  const projectSettings: ProjectSettings = {
    appName: "",
    projectId: uuid.v4(),
    version: getProjectSettingsVersion(),
  };
  return projectSettings;
}
export function isVSProject(projectSettings?: ProjectSettings): boolean {
  return projectSettings?.programmingLanguage === "csharp";
}
