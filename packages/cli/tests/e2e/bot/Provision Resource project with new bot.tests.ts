// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, BotValidator } from "fx-api";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setBotSkuNameToB1,
  cleanUp,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Provision", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: project with new bot - Test Plan ID 9729265`, async function () {
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities bot`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setBotSkuNameToB1(projectPath);

    // set subscription
    await execAsync(
      `teamsfx account set --subscription ${subscription}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    console.log(`[Successfully] set subscription for ${projectPath}`);

    // provision
    await execAsync(
      `teamsfx provision`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    console.log(`[Successfully] provision for ${projectPath}`);

    {
      // Validate provision
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Bot Provision
      const bot = BotValidator.init(context);
      await BotValidator.validateProvision(bot);
    }

    // deploy
    await execAsync(
      `teamsfx deploy bot`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] deploy for ${projectPath}`);

    {
      // Validate deployment

      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

      // Validate Bot Deploy
      const bot = BotValidator.init(context);
      await BotValidator.validateDeploy(bot);
    }


    // test (validate)
    await execAsync(
      `teamsfx test`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      /// TODO: add check for validate
    }

    // build
    await execAsync(
      `teamsfx build`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      /// TODO: add check for build
    }

    // publish
    await execAsync(
      `teamsfx publish`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      /// TODO: add check for publish
    }
  });

  after(async () => {
    // clean up
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await cleanUp(appName, projectPath);
  });
});
