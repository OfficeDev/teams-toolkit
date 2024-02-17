// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { validateLargeNotificationBot } from "../../utils/playwrightOperation";
import { SampledebugContext } from "./sampledebugContext";
import { getBotSiteEndpoint } from "../../utils/commonUtils";

class LargeNotiTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options: {
      context: SampledebugContext;
      displayName: string;
      includeFunction: boolean;
      npmName: string;
      env: "local" | "dev";
    }
  ): Promise<void> {
    const funcEndpoint = await getBotSiteEndpoint(
      options.context.projectPath,
      "dev"
    );
    return await validateLargeNotificationBot(
      page,
      funcEndpoint + "/api/notification"
    );
  }
}

new LargeNotiTestCase(
  TemplateProject.LargeScaleBot,
  25960873,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
