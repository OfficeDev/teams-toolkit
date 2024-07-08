// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { validateFiles } from "./helper.ts";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest.ts";

class CopilotPluginWithNoneAuthForJsCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

new CopilotPluginWithNoneAuthForJsCase(
  27569734,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.JS
).test();
