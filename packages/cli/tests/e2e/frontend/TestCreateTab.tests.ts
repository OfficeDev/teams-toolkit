// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { describe } from "mocha";
import fs from "fs-extra";
import path from "path";
import { AadValidator, FrontendValidator } from "../../commonlib";
import { environmentManager } from "@microsoft/teamsfx-core";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import M365Login from "../../../src/commonlib/m365Login";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
  describe("feature flags for API v3", async function () {
    it(`Create react app without Azure Function`, { testPlanCaseId: 9426074 }, async () => {
      // new a project ( tab only )
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
      {
        // Validate scaffold
        await FrontendValidator.validateScaffold(projectPath, "javascript");
      }
    });

    it(`Provision Resource: React app without function`, { testPlanCaseId: 10298738 }, async () => {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);

      await CliHelper.setSubscription(subscription, projectPath);

      await CliHelper.provisionProject(projectPath);

      // Validate provision
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Aad App
      const aad = AadValidator.init(context, false, M365Login);
      await AadValidator.validate(aad);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);
    });

    it(`Deploy react app without Azure Function and SQL`, { testPlanCaseId: 9454296 }, async () => {
      // deploy
      await execAsyncWithRetry(`teamsfx deploy`, {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      });

      // Validate deployment
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateDeploy(frontend);
    });
  });
});
