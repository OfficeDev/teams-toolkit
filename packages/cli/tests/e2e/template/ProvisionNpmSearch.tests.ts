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
  execAsync,
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv,
  getUniqueAppName,
} from "../commonUtils";
import { BotValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
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
      this.skip();
    }
    await CliHelper.createTemplateProject(
      appName,
      testFolder,
      TemplateProject.NpmSearch,
      "NPM-search-connector-M365"
    );

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, env);
    await bot.validateProvision(false);

    // deploy
    await CliHelper.deployAll(projectPath);

    {
      // Validate deployment

      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }

    // test (validate)
    await execAsync(`teamsfx validate`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    // package
    await execAsync(`teamsfx package`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
  });

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });
});
