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
import { Executor } from "../../utils/executor";
import { BotValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { assert } from "chai";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`${TemplateProject.NpmSearch}`, { testPlanCaseId: 15277471 }, async function () {
    await Executor.openTemplateProject(appName, testFolder, TemplateProject.NpmSearch);
    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    // Provision
    {
      const { success, stderr } = await Executor.provision(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Provision failed");
      }
    }

    // Validate Provision
    const context = await readContextMultiEnvV3(projectPath, env);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, env);
    await bot.validateProvisionV3(false);

    // deploy
    {
      const { success, stderr } = await Executor.deploy(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Deploy failed");
      }
    }

    // Validate deployment
    {
      // Get context
      const context = await readContextMultiEnvV3(projectPath, env);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }
    // validate
    {
      const { success, stderr } = await Executor.validate(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Validate failed");
      }
    }

    // package
    {
      const { success, stderr } = await Executor.package(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Package failed");
      }
    }
  });

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });
});
