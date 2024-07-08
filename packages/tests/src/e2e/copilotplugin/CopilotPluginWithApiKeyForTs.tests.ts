// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { replaceSecretKey, validateFiles } from "./helper.ts";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest.ts";
import * as path from "path";

class CopilotPluginWithNoneAuthForTsCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
      "src/keyGen.ts",
    ];
    validateFiles(projectPath, files);

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    replaceSecretKey(userFile);
  }
}

new CopilotPluginWithNoneAuthForTsCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.TS
).test();
