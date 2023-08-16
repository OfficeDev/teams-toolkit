// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { Executor } from "../../utils/executor";
import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";

class TodoListSpfxTestCase extends CaseFactory {
  override async onAfterCreate(projectPath: string): Promise<void> {
    expect(fs.pathExistsSync(path.resolve(projectPath, "src", "src"))).to.be
      .true;
  }
}

new TodoListSpfxTestCase(
  TemplateProjectFolder.TodoListSpfx,
  15277466,
  "v-ivanchen@microsoft.com",
  ["spfx"]
).test();
