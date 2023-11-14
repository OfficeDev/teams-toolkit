// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateProactiveMessaging } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import { setBotSkuNameToB1, setBotSkuNameToB1Bicep } from "../remotedebug/remotedebugContext";

class ProactiveMessagingTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateProactiveMessaging(page);
  }

  override async onAfterCreate(sampledebugContext: SampledebugContext, env: "local" | "dev", azSqlHelper?: AzSqlHelper | undefined): Promise<void> {
        // fix quota issue
        await setBotSkuNameToB1(sampledebugContext.projectPath);
        await setBotSkuNameToB1Bicep(sampledebugContext.projectPath, 'dev');
  }
}

new ProactiveMessagingTestCase(
  TemplateProject.ProactiveMessaging,
  24121478,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { testRootFolder: "./resource/samples", skipValidation: true }
).test();
