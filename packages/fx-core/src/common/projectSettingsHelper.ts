// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  ConfigFolderName,
  ProjectSettings,
  ProjectSettingsFileName,
  SettingsFileName,
  Settings,
  SettingsFolderName,
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
  BuiltInFeaturePluginNames,
} from "../component/constants";
import * as uuid from "uuid";
import { isExistingTabAppEnabled, isV3Enabled } from "./tools";
import { MetadataV3 } from "./versionMetadata";

export function validateProjectSettings(projectSettings: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return undefined;
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  let validateRes = validateStringArray(solutionSettings.azureResources);
  if (validateRes) {
    return `solutionSettings.azureResources validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.capabilities, [
    TabOptionItem().id,
    BotOptionItem().id,
    MessageExtensionItem().id,
    TabSPFxItem().id,
    TabSsoItem().id,
    BotSsoItem().id,
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
    if (isV3Enabled()) {
      return isValidProjectV3(workspacePath) || isValidProjectV2(workspacePath);
    } else {
      return isValidProjectV2(workspacePath);
    }
  } catch (e) {
    return false;
  }
}

export function isValidProjectV3(workspacePath: string): boolean {
  // TODO: should be cleaned after v3 folder changed.
  const filePath = path.resolve(workspacePath, SettingsFolderName, SettingsFileName);
  if (fs.existsSync(filePath)) {
    const projectSettings: Settings = fs.readJsonSync(filePath) as Settings;
    if (!projectSettings.trackingId) {
      return false;
    }
    if (!projectSettings.version) {
      return false;
    }
    return true;
  }
  const ymlFilePath = path.join(workspacePath, MetadataV3.configFile);
  const localYmlPath = path.join(workspacePath, MetadataV3.localConfigFile);
  if (fs.pathExistsSync(ymlFilePath) || fs.pathExistsSync(localYmlPath)) {
    return true;
  }
  return false;
}

export function isValidProjectV2(workspacePath: string): boolean {
  const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`, "configs");
  const settingsFile = path.resolve(confFolderPath, ProjectSettingsFileName);
  if (!fs.existsSync(settingsFile)) {
    return false;
  }
  const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
  if (validateProjectSettings(projectSettings)) return false;
  return true;
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
  const azurePlugins = getAzurePlugins(excludeAad);
  for (const pluginName of solutionSettings.activeResourcePlugins) {
    if (azurePlugins.includes(pluginName)) return true;
  }
  return false;
}

export function getAzurePlugins(excludeAad = false): string[] {
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
  return azurePlugins;
}

export function isExistingTabApp(projectSettings: ProjectSettings): boolean {
  if (!isExistingTabAppEnabled()) {
    return false;
  }

  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if (!solutionSettings) {
    return true;
  }

  // Scenario: SSO is added to existing tab app
  if (
    solutionSettings.capabilities?.length === 1 &&
    solutionSettings.capabilities.includes(TabSsoItem().id)
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
