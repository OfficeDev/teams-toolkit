// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateTodoList } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { editDotEnvFile } from "../../utils/commonUtils";
import * as path from "path";
import * as uuid from "uuid";

class TodoListM365TestCase extends CaseFactory {
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
  override async onValidate(
    page: Page,
    options?: { displayName: string }
  ): Promise<void> {
    return await validateTodoList(page, { displayName: options?.displayName });
  }
}

new TodoListM365TestCase(
  TemplateProject.TodoListM365,
  14571883,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { skipValidation: true }
).test();
