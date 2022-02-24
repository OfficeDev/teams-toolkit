// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";

export function generateBuildScript(projectSettings: ProjectSettings): string {
  const parts: string[] = [];

  const solutionSettings = projectSettings?.solutionSettings;
  const capabilities = solutionSettings?.["capabilities"];
  const azureResources = solutionSettings?.["azureResources"];

  if (capabilities?.includes("Tab")) {
    parts.push("cd tabs; npm install; npm run build; cd -;");
  }

  if (capabilities?.includes("Bot") || capabilities.includes("MessagingExtension")) {
    if (projectSettings.programmingLanguage == "typescript") {
      parts.push("cd bot; npm install; npm run build; cd -;");
    } else {
      parts.push("cd bot; npm install; cd -;");
    }
  }

  if (azureResources?.includes("function") && projectSettings.programmingLanguage == "typescript") {
    parts.push("cd api; npm install; npm run build; cd -;");
  }

  return parts.join("");
}
