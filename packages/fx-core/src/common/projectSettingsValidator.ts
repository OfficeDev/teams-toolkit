// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings, v3 } from "@microsoft/teamsfx-api";
import {
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
} from "../plugins/solution/fx-solution/question";

export function validateProjectSettings(projectSettings: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return undefined;
  const solutionSettings = projectSettings.solutionSettings as v3.TeamsFxSolutionSettings;
  if (solutionSettings.hostType === undefined) return "empty solutionSettings.hostType";
  let validateRes = validateStringArray(solutionSettings.azureResources);
  if (validateRes) {
    return `solutionSettings.azureResources validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.capabilities, [
    TabOptionItem.id,
    BotOptionItem.id,
    MessageExtensionItem.id,
  ]);
  if (validateRes) {
    return `solutionSettings.capabilities validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.activeResourcePlugins);
  if (validateRes) {
    return `solutionSettings.activeResourcePlugins validation failed: ${validateRes}`;
  }
  return undefined;
}

export function validateProjectSettingsV3(projectSettings: ProjectSettings): string | undefined {
  const res = validateProjectSettings(projectSettings);
  if (res) return res;
  const solutionSettings = projectSettings.solutionSettings as v3.TeamsFxSolutionSettings;
  if (!solutionSettings.modules) {
    return "solutionSettings.modules is undefined";
  }
  if (!Array.isArray(solutionSettings.modules)) {
    return "solutionSettings.modules is not array";
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
