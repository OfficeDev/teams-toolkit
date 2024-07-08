// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";
import { validateFiles } from "./helper";

class CopilotPluginOAuthForCsharpTestCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "TeamsApp/appPackage/ai-plugin.json",
      "TeamsApp/appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

new CopilotPluginOAuthForCsharpTestCase(
  28641204,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.CSharp
).test();
