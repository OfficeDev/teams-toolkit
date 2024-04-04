// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import * as path from "path";
import { editDotEnvFile } from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";

class TodoListBackendTestCase extends CaseFactory {
  override async onBeforeProvision(projectPath: string): Promise<void> {
    const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
    editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
    editDotEnvFile(
      envFilePath,
      "SQL_PASSWORD",
      "Cab232332" + getUuid().substring(0, 6)
    );
  }
}

new TodoListBackendTestCase(
  TemplateProjectFolder.TodoListBackend,
  15277465,
  "junhan@microsoft.com",
  ["aad", "tab", "function", "sql"]
).test();
