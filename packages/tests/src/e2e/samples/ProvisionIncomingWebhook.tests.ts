// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import fs from "fs-extra";
import path from "path";

class IncomingWebhookTestCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    fs.pathExistsSync(path.resolve(projectPath, "src", "adaptiveCards"));
  }
}

new IncomingWebhookTestCase(
  TemplateProjectFolder.IncomingWebhook,
  15277475,
  "qidon@microsoft.com",
  [],
  { skipProvision: true }
).test();
