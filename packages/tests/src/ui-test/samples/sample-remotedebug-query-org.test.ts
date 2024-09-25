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
import { SampledebugContext } from "./sampledebugContext";

class QueryOrgTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { context: SampledebugContext }
  ): Promise<void> {
    return await validateQueryOrg(page, {
      displayName: Env.displayName,
      appName: options?.context.appName.substring(0, 10) || "",
    });
  }
}

new QueryOrgTestCase(
  TemplateProject.QueryOrg,
  24121481,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
