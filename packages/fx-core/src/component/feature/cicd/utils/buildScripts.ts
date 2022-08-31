// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import {
  hasAzureTab,
  hasBot,
  hasApi,
  hasSPFxTab,
} from "../../../../common/projectSettingsHelperV3";

// TODO: add support for VS/.Net Projects.
export function generateBuildScript(projectSettings: ProjectSettings): string {
  const parts: string[] = [];

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

  if (hasApi(settingsV3) && projectSettings.programmingLanguage === "typescript") {
    parts.push("cd api; npm ci; npm run build; cd -;");
  }

  return parts.join("");
}
