// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateBot } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class BotSSODockerTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateBot(page, {
      botCommand: "show",
      expected: Env.displayName,
    });
  }
  public override async onCliValidate(page: Page): Promise<void> {
    return await validateBot(page, {
      botCommand: "show",
      expected: Env.displayName,
    });
  }
}

new BotSSODockerTestCase(
  TemplateProject.BotSSODocker,
  26577671,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartLocalTunnel, LocalDebugTaskLabel.StartApplication]
).test();
