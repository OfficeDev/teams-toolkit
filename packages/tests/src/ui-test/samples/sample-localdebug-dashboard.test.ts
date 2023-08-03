// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateDashboardTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";

class DashboardTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateDashboardTab(page);
  }
}

new DashboardTestCase(
  TemplateProject.Dashboard,
  17290453,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartFrontend,
    LocalDebugTaskLabel.WatchBackend,
    LocalDebugTaskLabel.StartBackend,
  ],
  { dashboardFlag: true }
).test();
