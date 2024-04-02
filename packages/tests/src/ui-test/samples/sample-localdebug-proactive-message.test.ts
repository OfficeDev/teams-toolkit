// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateProactiveMessaging } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";

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
}

new ProactiveMessagingTestCase(
  TemplateProject.ProactiveMessaging,
  17303781,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartLocalTunnel, LocalDebugTaskLabel.StartBot],
  {
    repoPath: "./resource/samples",
  }
).test();
