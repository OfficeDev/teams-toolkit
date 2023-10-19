// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateTabApim } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class SsotabApimTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateTabApim(page, {
      displayName: Env.displayName,
    });
  }
}

new SsotabApimTestCase(
  TemplateProject.TabSSOApimProxy,
  25191534,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
