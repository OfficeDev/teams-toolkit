// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, FunctionValidator, SimpleAuthValidator } from "../../commonlib";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  cleanUp,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Test Add Function", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Create Tab Then Add Function`, async function() {
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities tab`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setSimpleAuthSkuNameToB1(projectPath);

    await execAsync(
      `teamsfx resource add azure-function --function-name func1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    await execAsync(
      `teamsfx resource add azure-function --function-name func2`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    console.log(`[Successfully] add function to ${projectPath}`);

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

      // Validate Simple Auth
      const simpleAuth = SimpleAuthValidator.init(context);
      await SimpleAuthValidator.validate(simpleAuth, aad);

      // Validate Function App
      const func = FunctionValidator.init(context);
      await FunctionValidator.validateProvision(func, false);
    }

    // deploy
    await execAsync(
      `teamsfx deploy function`,
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

      // Validate Function App
      const func = FunctionValidator.init(context);
      await FunctionValidator.validateDeploy(func);
    }


    // validate
    await execAsync(
      `teamsfx validate`,
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

    /// TODO: Publish broken: https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9856390
    // // publish
    // await execAsync(
    //   `teamsfx publish`,
    //   {
    //     cwd: projectPath,
    //     env: process.env,
    //     timeout: 0
    //   }
    // );

    // {
    //   /// TODO: add check for publish
    // }
  });

  after(async () => {
    // clean up
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await cleanUp(appName, projectPath);
  });
});
