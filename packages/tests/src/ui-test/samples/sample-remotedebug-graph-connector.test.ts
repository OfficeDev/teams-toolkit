// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
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
  14571877,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
