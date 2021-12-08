// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yitong Feng <yitong.feng@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";

import { AadValidator, BotValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setBotSkuNameToB1,
  cleanUp,
  readContext,
  setBotSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";

describe("Provision", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: project with new bot - Test Plan ID 9729265`, async function () {
    await execAsync(`teamsfx new --interactive false --app-name ${appName} --capabilities bot`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    if (isMultiEnvEnabled()) {
      await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setBotSkuNameToB1(projectPath);
    }

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
      if (isMultiEnvEnabled()) {
        // Validate provision
        // Get context
        const context = await readContextMultiEnv(
          projectPath,
          environmentManager.getDefaultEnvName()
        );

        // Validate Aad App
        const aad = AadValidator.init(context, false, AppStudioLogin);
        await AadValidator.validate(aad);

        // Validate Bot Provision
        const bot = BotValidator.init(context, true);
        await BotValidator.validateProvision(bot, true);
      } else {
        // Validate provision
        // Get context
        const context = await readContext(projectPath);

        // Validate Aad App
        const aad = AadValidator.init(context, false, AppStudioLogin);
        await AadValidator.validate(aad);

        // Validate Bot Provision
        const bot = BotValidator.init(context);
        await BotValidator.validateProvision(bot);
      }
    }

    // deploy
    await execAsyncWithRetry(`teamsfx deploy bot`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] deploy for ${projectPath}`);

    {
      if (isMultiEnvEnabled()) {
        // Validate deployment

        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Bot Deploy
        const bot = BotValidator.init(context, true);
        await BotValidator.validateDeploy(bot);
      } else {
        // Validate deployment

        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

        // Validate Bot Deploy
        const bot = BotValidator.init(context);
        await BotValidator.validateDeploy(bot);
      }
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
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, true, false, true);
    } else {
      await cleanUp(appName, projectPath, true, true, false);
    }
  });
});
