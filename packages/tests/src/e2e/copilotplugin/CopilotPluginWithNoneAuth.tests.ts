// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import * as path from "path";
import * as fs from "fs-extra";
import { expect } from "chai";

class CopilotPluginWithNoneAuthCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
    }
  }
}

const env = Object.assign({}, process.env);
env["API_COPILOT_PLUGIN"] = "true";
env["DEVELOP_COPILOT_PLUGIN"] = "true";
const record: Record<string, string> = {};
record["api-auth"] = "none";

const options = {
  skipErrorMessage: "No elements found in the manifest",
  skipValidate: true,
};

new CopilotPluginWithNoneAuthCase(
  Capability.CopilotPluginFromScratch,
  27569734,
  "yiminjin@microsoft.com",
  ["function"],
  ProgrammingLanguage.TS,
  options,
  record,
  env
).test();
