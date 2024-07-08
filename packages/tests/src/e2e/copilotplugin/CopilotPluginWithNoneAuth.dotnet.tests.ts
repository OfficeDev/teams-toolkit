// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { validateFiles } from "./helper.ts";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest.ts";

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
  27569734,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.CSharp
).test();
