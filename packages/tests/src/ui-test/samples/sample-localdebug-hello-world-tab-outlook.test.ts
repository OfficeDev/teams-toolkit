// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validatePersonalTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";

class OutlookTabTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validatePersonalTab(page);
  }
}

new OutlookTabTestCase(
  TemplateProject.OutlookTab,
  17451443,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend]
).test();
