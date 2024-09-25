// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class SsotabApimTestCase extends CaseFactory {
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

new SsotabApimTestCase(
  TemplateProject.TabSSOApimProxy,
  25190654,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend],
  {
    debug: "cli",
  }
).test();
