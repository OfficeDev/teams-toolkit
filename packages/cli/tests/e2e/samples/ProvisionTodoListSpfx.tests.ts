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

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`${TemplateProject.TodoListSpfx}`, { testPlanCaseId: 15277466 }, async function () {
    await Executor.openTemplateProject(appName, testFolder, TemplateProject.TodoListSpfx);
    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, "src", "src"))).to.be.true;

    // test (validate)
    await Executor.validate(projectPath);

    // provision
    await Executor.provision(projectPath);

    // deploy
    await Executor.deploy(projectPath);
  });

  afterEach(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
