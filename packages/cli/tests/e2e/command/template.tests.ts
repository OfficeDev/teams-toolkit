// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { execAsync, getTestFolder, cleanUpLocalProject } from "../commonUtils";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const sampleName = "todo-list-with-Azure-backend";
  const projectPath = path.resolve(testFolder, sampleName);

  it(`${sampleName}`, { testPlanCaseId: 15685967 }, async function () {
    /// TODO: will be open after samples are ready
    if (isV3Enabled()) {
      this.skip();
    }
    await execAsync(`teamsfx new template ${sampleName}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
