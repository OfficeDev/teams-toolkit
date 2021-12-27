// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";

import { AadValidator, FunctionValidator, SimpleAuthValidator } from "../../commonlib";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Test Add Function", function () {
  let testFolder: string;
  let appName: string;
  let subscription: string;
  let projectPath: string;

  // Should succeed on the 3rd try
  this.retries(2);

  beforeEach(() => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    subscription = getSubscriptionId();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    // clean up
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, false, false, true);
    } else {
      await cleanUp(appName, projectPath);
    }
  });

  it(`Create Tab Then Add Function`, async function () {
    await execAsync(`teamsfx new --interactive false --app-name ${appName} --capabilities tab`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    if (isMultiEnvEnabled()) {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setSimpleAuthSkuNameToB1(projectPath);
    }

    await execAsync(`teamsfx resource add azure-function --function-name func1`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    await execAsync(`teamsfx resource add azure-function --function-name func2`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`[Successfully] add function to ${projectPath}`);

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
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Aad App
        const aad = AadValidator.init(context, false, AppStudioLogin);
        await AadValidator.validate(aad);

        // Validate Simple Auth
        const simpleAuth = SimpleAuthValidator.init(context);
        await SimpleAuthValidator.validate(simpleAuth, aad, "B1", true);

        // Validate Function App
        const func = FunctionValidator.init(context, true);
        await FunctionValidator.validateProvision(func, false, true);
      } else {
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
    }

    // deploy
    await execAsyncWithRetry(`teamsfx deploy function`, {
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

        // Validate Function App
        const func = FunctionValidator.init(context, true);
        await FunctionValidator.validateDeploy(func);
      } else {
        // Validate deployment

        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

        // Validate Function App
        const func = FunctionValidator.init(context);
        await FunctionValidator.validateDeploy(func);
      }
    }

    // validate
    await execAsyncWithRetry(`teamsfx manifest validate`, {
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

    /// TODO: Publish broken: https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9856390
    // // publish
    // await execAsyncWithRetry(
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
});
