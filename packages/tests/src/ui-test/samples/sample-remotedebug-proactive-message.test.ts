// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateProactiveMessaging } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";

class ProactiveMessagingTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateProactiveMessaging(page);
  }
}

new ProactiveMessagingTestCase(
  TemplateProject.ProactiveMessaging,
  24121478,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { testRootFolder: "./resource/samples", skipValidation: true }
).test();
