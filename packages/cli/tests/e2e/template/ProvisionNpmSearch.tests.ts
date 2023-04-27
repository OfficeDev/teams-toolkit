// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import {
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv,
  readContextMultiEnvV3,
  getUniqueAppName,
} from "../commonUtils";
import { Executor } from "../../utils/executor";
import { BotValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`${TemplateProject.NpmSearch}`, { testPlanCaseId: 15277471 }, async function () {
    if (isV3Enabled()) {
      await Executor.openTemplateProject(appName, testFolder, TemplateProject.NpmSearch);
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
    } else {
      await Executor.createTemplateProject(appName, testFolder, TemplateProject.NpmSearch);
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;
    }

    // Provision
    if (isV3Enabled()) {
    } else {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await Executor.setSubscription(subscription, projectPath);
    }
    await Executor.provision(projectPath);

    // Validate Provision
    const context = isV3Enabled()
      ? await readContextMultiEnvV3(projectPath, env)
      : await readContextMultiEnv(projectPath, env);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, env);
    if (isV3Enabled()) {
      await bot.validateProvisionV3(false);
    } else {
      await bot.validateProvision(false);
    }

    // deploy
    await Executor.deploy(projectPath);

    {
      // Validate deployment
      // Get context
      const context = isV3Enabled()
        ? await readContextMultiEnvV3(projectPath, env)
        : await readContextMultiEnv(projectPath, env);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }

    // test (validate)
    await Executor.validate(projectPath);

    // package
    await Executor.package(projectPath);
  });

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });
});
