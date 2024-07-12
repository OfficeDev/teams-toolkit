// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";

class CopilotPluginWithNoneAuthCase extends CopilotPluginCommonTest {}
const validateFiles = ["appPackage/ai-plugin.json", "appPackage/manifest.json"];

new CopilotPluginWithNoneAuthCase(
  27569734,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.JS,
  validateFiles
).test();

new CopilotPluginWithNoneAuthCase(
  27569734,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.TS,
  validateFiles
).test();

new CopilotPluginWithNoneAuthCase(
  27569734,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.CSharp,
  validateFiles
).test();
