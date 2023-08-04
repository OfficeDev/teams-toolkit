// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validatePersonalTab } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { editDotEnvFile } from "../../utils/commonUtils";
import * as path from "path";
import * as uuid from "uuid";

class OutlookTabTestCase extends CaseFactory {
  public override async onAfter(
    sampledebugContext: SampledebugContext
  ): Promise<void> {
    await sampledebugContext.sampleAfter(
      `${sampledebugContext.appName}-dev-rg`
    );
  }
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext
  ): Promise<void> {
    const envFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      ".env.dev.user"
    );
    editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
    editDotEnvFile(
      envFilePath,
      "SQL_PASSWORD",
      "Cab232332" + uuid.v4().substring(0, 6)
    );
  }
  override async onValidate(page: Page): Promise<void> {
    return await validatePersonalTab(page);
  }
}

new OutlookTabTestCase(
  TemplateProject.TodoListM365,
  14571883,
  "v-ivanchen@microsoft.com",
  "dev"
).test();
