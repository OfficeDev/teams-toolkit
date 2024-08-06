// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import fs from "fs-extra";
import path from "path";

class HelloWorldTabBackEndTestCase extends CaseFactory {
  override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper
  ): Promise<void> {
    console.log("changing swa sku...");
    const bicepJsonFile = path.join(
      sampledebugContext.projectPath,
      "infra",
      "azure.parameters.json"
    );
    const bicepJson = fs.readJsonSync(bicepJsonFile);
    bicepJson["parameters"]["functionAppSKU"]["value"] = "Standard";
    fs.writeJsonSync(bicepJsonFile, bicepJson);
  }

  override async onValidate(
    page: Page,
    options?: { includeFunction: boolean }
  ): Promise<void> {
    return await validateTab(page, {
      displayName: Env.displayName,
      includeFunction: options?.includeFunction,
    });
  }
}

new HelloWorldTabBackEndTestCase(
  TemplateProject.HelloWorldTabBackEnd,
  13523920,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
