// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";
import { AadValidator, FrontendValidator, SimpleAuthValidator } from "../../commonlib";
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

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  // Should succeed on the 3rd try
  this.retries(2);

  it("Create react app without Azure Function", async () => {
    // new a project ( tab only )
    await execAsync(`teamsfx new --interactive false --app-name ${appName} --capabilities tab `, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    {
      // Validate scaffold
      await FrontendValidator.validateScaffold(projectPath, "javascript");
    }
  });

  it("Provision Resource: React app without function", async () => {
    if (isMultiEnvEnabled()) {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setSimpleAuthSkuNameToB1(projectPath);
    }

    // set subscription
    await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    // provision
    await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

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
        await SimpleAuthValidator.validate(simpleAuth, aad);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context, true);
        await FrontendValidator.validateProvision(frontend);
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

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateProvision(frontend);
      }
    }
  });

  it("Deploy react app without Azure Function and SQL", async () => {
    // deploy
    await execAsyncWithRetry(`teamsfx deploy`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      if (isMultiEnvEnabled()) {
        // Validate deployment
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context, true);
        await FrontendValidator.validateDeploy(frontend);
      } else {
        // Validate deployment
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateDeploy(frontend);
      }
    }
  });

  after(async () => {
    // clean up
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, false, false, true);
    } else {
      await cleanUp(appName, projectPath);
    }
  });
});
