// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateProactiveMessaging } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { setBotSkuNameToB1Bicep } from "../remotedebug/remotedebugContext";

class ProactiveMessagingTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { env: "dev" | "local"; context: SampledebugContext }
  ): Promise<void> {
    return await validateProactiveMessaging(page, {
      env: options?.env || "dev",
      context: options?.context,
    });
  }

  override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    // fix quota issue
    await setBotSkuNameToB1Bicep(
      sampledebugContext.projectPath,
      "templates/azure/azure.parameters.dev.json"
    );
  }
}

new ProactiveMessagingTestCase(
  TemplateProject.ProactiveMessaging,
  24121478,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { repoPath: "./resource/samples" }
).test();
