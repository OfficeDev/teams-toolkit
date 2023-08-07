// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateOneProducitvity } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class OneProductivityHubTestCase extends CaseFactory {
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
  15090375,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend]
).test();
