// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateNpm } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";

class NpmSearchTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { npmName: string; context: SampledebugContext }
  ): Promise<void> {
    return await validateNpm(page, {
      npmName: options?.npmName,
      appName: options?.context.appName.substring(0, 10) || "",
    });
  }
}

new NpmSearchTestCase(
  TemplateProject.NpmSearch,
  14571879,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { npmName: "axios" }
).test();
