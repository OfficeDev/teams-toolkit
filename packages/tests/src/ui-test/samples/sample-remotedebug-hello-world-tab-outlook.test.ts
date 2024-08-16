// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validatePersonalTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import fs from "fs-extra";
import path from "path";

class OutlookTabTestCase extends CaseFactory {
  override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    // update swa sku to standard
    const bicepPath = path.join(
      sampledebugContext.projectPath,
      "infra",
      "azure.parameters.json"
    );
    const bicep = fs.readJsonSync(bicepPath);
    bicep["parameters"]["staticWebAppSku"]["value"] = "Standard";
    fs.writeJsonSync(bicepPath, bicep);
  }
  override async onValidate(page: Page): Promise<void> {
    return await validatePersonalTab(page);
  }
}

new OutlookTabTestCase(
  TemplateProject.OutlookTab,
  24121457,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
