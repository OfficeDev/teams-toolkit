// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateGraphConnector } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class GraphConnectorTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { displayName: string }
  ): Promise<void> {
    return await validateGraphConnector(page, { displayName: Env.displayName });
  }
}

new GraphConnectorTestCase(
  TemplateProject.GraphConnector,
  14171510,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartFrontend,
    LocalDebugTaskLabel.WatchBackend,
    LocalDebugTaskLabel.StartBackend,
  ]
).test();
