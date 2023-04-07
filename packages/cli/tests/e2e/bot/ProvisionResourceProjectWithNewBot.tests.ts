// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Siglud <fanhu@microsoft.com>
 */

import * as fs from "fs-extra";
import * as path from "path";

import { BotValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setBotSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";

import { it } from "@microsoft/extra-shot-mocha";

describe("Provision", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it("Provision Resource: project with new bot", { testPlanCaseId: 10306848 }, async function () {
    if (isV3Enabled()) {
      return this.skip();
    }
    await execAsync(`teamsfx new --interactive false --app-name ${appName} --capabilities bot`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setBotSkuNameToB1Bicep(projectPath, env);

    // set subscription
    await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`[Successfully] set subscription for ${projectPath}`);

    // provision
    await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`[Successfully] provision for ${projectPath}`);

    {
      // Validate provision
      // Get context
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Bot Provision
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateProvision(false);
    }

    // deploy
    await execAsyncWithRetry(`teamsfx deploy bot`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] deploy for ${projectPath}`);

    {
      // Validate deployment

      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Bot Deploy
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateDeploy();
    }

    // test (validate)
    await execAsyncWithRetry(`teamsfx validate`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      /// TODO: add check for validate
    }

    // package
    await execAsyncWithRetry(`teamsfx package`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      /// TODO: add check for package
    }
  });

  after(async () => {
    // clean up
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    // disable temporarily to protect env for debug
    await cleanUp(appName, projectPath, false, true, false);
  });
});
