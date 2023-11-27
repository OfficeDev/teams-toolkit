// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, ValidationContent } from "../../utils/constants";
import { validateBot } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";

class GraphConnectorBotTestCase extends CaseFactory {
  override async onValidate(page: Page): Promise<void> {
    return await validateBot(page, {
      botCommand: "welcome",
      expected: ValidationContent.GraphBot,
    });
  }
}

new GraphConnectorBotTestCase(
  TemplateProject.GraphConnectorBot,
  25960851,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
