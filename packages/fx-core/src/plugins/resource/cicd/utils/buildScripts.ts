// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import {
  hasAzureTab,
  hasBot,
  hasFunction,
  hasSPFxTab,
} from "../../../../common/projectSettingsHelperV3";
import { isV3 } from "../../../../core/globalVars";

// TODO: add support for VS/.Net Projects.
export function generateBuildScript(projectSettings: ProjectSettings): string {
  const parts: string[] = [];
  if (isV3()) {
    const settingsV3 = projectSettings as ProjectSettingsV3;
    if (hasAzureTab(settingsV3)) parts.push("cd tabs; npm ci; npm run build; cd -;");
    if (hasSPFxTab(settingsV3)) parts.push("cd SPFx; npm ci; npm run build; cd -;");

    if (hasBot(settingsV3)) {
      if (projectSettings.programmingLanguage === "typescript") {
        parts.push("cd bot; npm ci; npm run build; cd -;");
      } else {
        parts.push("cd bot; npm ci; cd -;");
      }
    }

    if (hasFunction(settingsV3) && projectSettings.programmingLanguage === "typescript") {
      parts.push("cd api; npm ci; npm run build; cd -;");
    }
  } else {
    const solutionSettings = projectSettings?.solutionSettings;
    const capabilities = solutionSettings?.["capabilities"];
    const azureResources = solutionSettings?.["azureResources"];
    const hostType = solutionSettings?.["hostType"];

    if (capabilities?.includes("Tab")) {
      if (hostType && hostType === "Azure") parts.push("cd tabs; npm ci; npm run build; cd -;");
      if (hostType && hostType === "SPFx") parts.push("cd SPFx; npm ci; npm run build; cd -;");
    }

    if (capabilities?.includes("Bot") || capabilities.includes("MessagingExtension")) {
      if (projectSettings.programmingLanguage === "typescript") {
        parts.push("cd bot; npm ci; npm run build; cd -;");
      } else {
        parts.push("cd bot; npm ci; cd -;");
      }
    }

    if (
      azureResources?.includes("function") &&
      projectSettings.programmingLanguage === "typescript"
    ) {
      parts.push("cd api; npm ci; npm run build; cd -;");
    }
  }

  return parts.join("");
}
