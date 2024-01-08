// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateTodoList } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

class TodoListM365TestCase extends CaseFactory {
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    const targetPath = path.resolve(sampledebugContext.projectPath, "tabs");
    const data = "src/";
    // create .eslintignore
    fs.writeFileSync(targetPath + "/.eslintignore", data);
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
  12664741,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend, LocalDebugTaskLabel.StartBackend],
  {
    teamsAppName: "toDoList-local",
    skipValidation: true,
    debug: ["cli", "ttk"][Math.floor(Math.random() * 2)] as "cli" | "ttk",
    testRootFolder: path.resolve(os.homedir(), "resourse"), // fix eslint error
  }
).test();
