// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { validateFiles } from "./helper";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";
class CopilotPluginWithNoneAuthForCsharpCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "TeamsApp/appPackage/ai-plugin.json",
      "TeamsApp/appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

new CopilotPluginWithNoneAuthForCsharpCase(
  28641262,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.CSharp
).test();
