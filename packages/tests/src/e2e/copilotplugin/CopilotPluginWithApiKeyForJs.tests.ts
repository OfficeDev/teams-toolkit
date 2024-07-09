// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { replaceSecretKey, validateFiles } from "./helper";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";
import * as path from "path";

class CopilotPluginWithNoneAuthForJsCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
      "src/keyGen.js",
    ];
    await validateFiles(projectPath, files);

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    await replaceSecretKey(userFile);
  }
}

new CopilotPluginWithNoneAuthForJsCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.JS
).test();
