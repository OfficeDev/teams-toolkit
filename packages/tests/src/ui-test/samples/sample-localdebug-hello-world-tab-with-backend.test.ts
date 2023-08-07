// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { Env } from "../../utils/env";

class HelloWorldTabBackEndTestCase extends CaseFactory {
  override async onValidate(
    page: Page,
    options?: { includeFunction: boolean }
  ): Promise<void> {
    return await validateTab(page, {
      displayName: Env.displayName,
      includeFunction: options?.includeFunction,
    });
  }
}

new HelloWorldTabBackEndTestCase(
  TemplateProject.HelloWorldTabBackEnd,
  12684063,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartFrontend,
    LocalDebugTaskLabel.WatchBackend,
    LocalDebugTaskLabel.StartBackend,
  ]
).test();
