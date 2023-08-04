// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateDashboardTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";

class AssistDashboardTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateDashboardTab(page);
  }
}

new AssistDashboardTestCase(
  TemplateProject.AssistDashboard,
  24121439,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { dashboardFlag: true, skipInit: true } // [TODO] skipInit browser security block
).test();
