// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";

class CopilotPluginWithApiKeyAuthCase extends CopilotPluginCommonTest {}
const validateFiles = {
  [ProgrammingLanguage.JS]: [
    "appPackage/ai-plugin.json",
    "appPackage/manifest.json",
    "src/keyGen.js",
  ],
  [ProgrammingLanguage.TS]: [
    "appPackage/ai-plugin.json",
    "appPackage/manifest.json",
    "src/keyGen.ts",
  ],
  [ProgrammingLanguage.CSharp]: [
    "appPackage/ai-plugin.json",
    "appPackage/manifest.json",
    "GenerateApiKey.ps1",
  ],
};
new CopilotPluginWithApiKeyAuthCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.JS,
  validateFiles[ProgrammingLanguage.JS]
).test();

new CopilotPluginWithApiKeyAuthCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.TS,
  validateFiles[ProgrammingLanguage.TS]
).test();

new CopilotPluginWithApiKeyAuthCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.CSharp,
  validateFiles[ProgrammingLanguage.CSharp]
).test();
