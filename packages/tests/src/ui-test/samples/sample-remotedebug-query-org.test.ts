// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateQueryOrg } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class QueryOrgTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    option?: { displayName: string }
  ): Promise<void> {
    return await validateQueryOrg(page, { displayName: Env.displayName });
  }
}

new QueryOrgTestCase(
  TemplateProject.QueryOrg,
  24121481,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
