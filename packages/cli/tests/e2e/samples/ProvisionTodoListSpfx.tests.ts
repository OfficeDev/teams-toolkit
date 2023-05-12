// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { getTestFolder, cleanUpLocalProject, getUniqueAppName } from "../commonUtils";
import { TemplateProject } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { assert } from "chai";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`${TemplateProject.TodoListSpfx}`, { testPlanCaseId: 15277466 }, async function () {
    await Executor.openTemplateProject(appName, testFolder, TemplateProject.TodoListSpfx);
    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, "src", "src"))).to.be.true;

    // validate
    await Executor.validate(projectPath);

    // provision
    {
      const { success, stderr } = await Executor.provision(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Provision failed");
      }
    }

    // deploy
    {
      const { success, stderr } = await Executor.deploy(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Deploy failed");
      }
    }
  });

  afterEach(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
