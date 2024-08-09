// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateTabApim } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import fs from "fs-extra";
import path from "path";
class SsotabApimTestCase extends CaseFactory {
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
    return await validateTabApim(page, {
      displayName: Env.displayName,
    });
  }
}

new SsotabApimTestCase(
  TemplateProject.TabSSOApimProxy,
  25191534,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
