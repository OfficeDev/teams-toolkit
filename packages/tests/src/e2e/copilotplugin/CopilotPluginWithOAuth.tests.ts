// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";

class CopilotPluginWithOAuthCase extends CopilotPluginCommonTest {}
const validateFiles = [
  "appPackage/ai-plugin.dev.json",
  "appPackage/manifest.json",
];

new CopilotPluginWithOAuthCase(
  28641204,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.JS,
  validateFiles
).test();

new CopilotPluginWithOAuthCase(
  28641204,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.TS,
  validateFiles
).test();

new CopilotPluginWithOAuthCase(
  28641204,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.CSharp,
  validateFiles
).test();
