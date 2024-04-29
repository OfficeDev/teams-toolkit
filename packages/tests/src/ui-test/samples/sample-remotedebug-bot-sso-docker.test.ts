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
}

new BotSSODockerTestCase(
  TemplateProject.BotSSODocker,
  27852471,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
