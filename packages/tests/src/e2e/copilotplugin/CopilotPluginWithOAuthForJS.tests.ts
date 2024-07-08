// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";

class CopilotPluginOAuthTestCase extends CopilotPluginCommonTest {}

new CopilotPluginOAuthTestCase(
  27569691,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.JS
).test();
