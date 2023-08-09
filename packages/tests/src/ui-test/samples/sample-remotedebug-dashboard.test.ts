// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateDashboardTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";

class DashboardTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateDashboardTab(page);
  }
}

new DashboardTestCase(
  TemplateProject.Dashboard,
  24121453,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { dashboardFlag: true }
).test();
