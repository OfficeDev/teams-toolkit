// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateContact } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class ContactExporterTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { displayName: string }
  ): Promise<void> {
    return await validateContact(page, { displayName: Env.displayName });
  }
}

new ContactExporterTestCase(
  TemplateProject.ContactExporter,
  14571878,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
