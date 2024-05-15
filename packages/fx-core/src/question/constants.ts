// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../common/localizeUtils";

export const copilotPluginApiSpecOptionId = "copilot-plugin-existing-api";
export const copilotPluginOpenAIPluginOptionId = "copilot-plugin-openai-plugin";
export const copilotPluginExistingApiOptionIds = [
  copilotPluginApiSpecOptionId,
  copilotPluginOpenAIPluginOptionId,
];
export const copilotPluginNewApiOptionId = "copilot-plugin-new-api";
export const copilotPluginOptionIds = [
  copilotPluginNewApiOptionId,
  copilotPluginApiSpecOptionId,
  copilotPluginOpenAIPluginOptionId,
];
export const capabilitiesHavePythonOption = [
  "custom-copilot-basic",
  "custom-copilot-rag-azureAISearch",
  "custom-copilot-rag-customize",
  "custom-copilot-agent-new",
];

export class RuntimeOptions {
  static NodeJS(): OptionItem {
    return {
      id: "node",
      label: "Node.js",
      detail: getLocalizedString("core.RuntimeOptionNodeJS.detail"),
    };
  }
  static DotNet(): OptionItem {
    return {
      id: "dotnet",
      label: ".NET Core",
      detail: getLocalizedString("core.RuntimeOptionDotNet.detail"),
    };
  }
}
