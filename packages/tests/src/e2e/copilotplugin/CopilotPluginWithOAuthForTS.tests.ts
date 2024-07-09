// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";
import { validateFiles } from "./helper";

class CopilotPluginOAuthForTsTestCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.dev.json",
      "appPackage/manifest.json",
    ];
    await validateFiles(projectPath, files);
  }
}

new CopilotPluginOAuthForTsTestCase(
  27569691,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.TS
).test();
