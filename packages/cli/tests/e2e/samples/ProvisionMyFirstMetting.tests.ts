// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { getTestFolder, cleanUp, readContextMultiEnvV3, getUniqueAppName } from "../commonUtils";
import { FrontendValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`${TemplateProject.MyFirstMetting}`, { testPlanCaseId: 15277468 }, async function () {
    await Executor.openTemplateProject(appName, testFolder, TemplateProject.MyFirstMetting);
    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    // Provision
    {
      const { success } = await Executor.provision(projectPath);
      expect(success).to.be.true;
    }

    // Validate Provision
    const context = await readContextMultiEnvV3(projectPath, env);
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    {
      const { success } = await Executor.deploy(projectPath);
      expect(success).to.be.true;
    }
  });

  after(async () => {
    await cleanUp(appName, projectPath, false, false, false);
  });
});
