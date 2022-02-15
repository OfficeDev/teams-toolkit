// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function generateBuildScript(capabilities: string[], programmingLanguage: string): string {
  const buildScript = "";
  const parts: string[] = [];

  if (capabilities.includes("Tab")) {
    parts.push("cd tabs; npm install; npm run build; cd -;");
  }

  if (capabilities.includes("Bot") || capabilities.includes("MessagingExtension")) {
    if (programmingLanguage == "typescript") {
      parts.push("cd bot; npm install; npm run build; cd -;");
    } else {
      parts.push("cd bot; npm install; cd -;");
    }
  }

  return parts.join("");
}
