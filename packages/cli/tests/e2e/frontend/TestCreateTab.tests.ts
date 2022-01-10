// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";
import { AadValidator, FrontendValidator, SimpleAuthValidator } from "../../commonlib";
import { environmentManager } from "@microsoft/teamsfx-core";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it("Create react app without Azure Function", async () => {
    // new a project ( tab only )
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    {
      // Validate scaffold
      await FrontendValidator.validateScaffold(projectPath, "javascript");
    }
  });

  it("Provision Resource: React app without function", async () => {
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

    await CliHelper.setSubscription(subscription, projectPath);

    await CliHelper.provisionProject(projectPath);

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
  });

  it("Deploy react app without Azure Function and SQL", async () => {
    // deploy
    await execAsyncWithRetry(`teamsfx deploy`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    // Validate deployment
    const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context, true);
    await FrontendValidator.validateDeploy(frontend);
  });
});
