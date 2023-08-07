// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateAdaptiveCard } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";

class AdaptiveCardTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { context: SampledebugContext; env: "local" | "dev" }
  ): Promise<void> {
    return await validateAdaptiveCard(page, {
      context: options?.context,
      env: options?.env,
    });
  }
}

new AdaptiveCardTestCase(
  TemplateProject.AdaptiveCard,
  24121425,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
