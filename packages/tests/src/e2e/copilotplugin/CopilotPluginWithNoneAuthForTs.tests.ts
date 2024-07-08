// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { validateFiles } from "./helper";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";

class CopilotPluginWithNoneAuthForTsCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

new CopilotPluginWithNoneAuthForTsCase(
  27569734,
  "yimin@microsoft.com",
  "none",
  ProgrammingLanguage.TS
).test();
