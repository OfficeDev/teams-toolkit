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
import { BotValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();
  let teamsAppId: string | undefined;

  it(`${TemplateProject.AdaptiveCard}`, { testPlanCaseId: 15277474 }, async function () {
    await Executor.openTemplateProject(appName, testFolder, TemplateProject.AdaptiveCard);
    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    // Provision
    await Executor.provision(projectPath);

    // Validate Provision
    const context = await readContextMultiEnvV3(projectPath, env);

    // Validate Bot Provision
    const bot = new BotValidator(context, projectPath, env);
    if (isV3Enabled()) {
      await bot.validateProvisionV3(false);
    } else {
      await bot.validateProvision(false);
    }

    // deploy
    await Executor.deploy(projectPath);

    // Validate deployment
    {
      // Get context
      const context = await readContextMultiEnvV3(projectPath, env);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }
  });

  afterEach(async () => {
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await cleanUp(appName, projectPath, false, true, false, teamsAppId);
  });
});
