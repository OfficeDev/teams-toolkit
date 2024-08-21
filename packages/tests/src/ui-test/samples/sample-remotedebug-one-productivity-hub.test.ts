// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateOneProducitvity } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import fs from "fs-extra";
import path from "path";

class OneProductivityHubTestCase extends CaseFactory {
  override async onAfterCreate(
    sampledebugContext: SampledebugContext
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
  override async onValidate(
    page: Page,
    option?: { displayName: string }
  ): Promise<void> {
    return await validateOneProducitvity(page, {
      displayName: Env.displayName,
    });
  }
}

new OneProductivityHubTestCase(
  TemplateProject.OneProductivityHub,
  24121468,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
