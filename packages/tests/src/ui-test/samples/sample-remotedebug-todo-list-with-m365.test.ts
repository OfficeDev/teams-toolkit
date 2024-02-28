// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { validateTodoList, reopenPage } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { editDotEnvFile } from "../../utils/commonUtils";
import { Env } from "../../utils/env";

import * as path from "path";
import * as uuid from "uuid";
import * as os from "os";

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
  override async onCliValidate(
    page: Page,
    options?: { displayName: string }
  ): Promise<void> {
    return await validateTodoList(page, { displayName: options?.displayName });
  }
  public override async onReopenPage(
    sampledebugContext: SampledebugContext,
    teamsAppId: string
  ): Promise<Page> {
    return await reopenPage(
      sampledebugContext.context!,
      teamsAppId,
      Env.username,
      Env.password,
      undefined,
      true,
      true
    );
  }
}

new TodoListM365TestCase(
  TemplateProject.TodoListM365,
  14571883,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  {
    testRootFolder: path.resolve(os.homedir(), "resourse"), // fix eslint error
  }
).test();
