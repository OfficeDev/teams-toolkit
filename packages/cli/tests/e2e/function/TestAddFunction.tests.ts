// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import * as path from "path";
import * as chai from "chai";
import { AadValidator, FunctionValidator, AppStudioValidator } from "../../commonlib";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  loadContext,
} from "../commonUtils";
import M365Login from "../../../src/commonlib/m365Login";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { describe } from "mocha";
import { it } from "@microsoft/extra-shot-mocha";

describe("Test Add Function", function () {
  let testFolder: string;
  let appName: string;
  let subscription: string;
  let projectPath: string;
  let env: string;
  let teamsAppId: string | undefined;

  // Should succeed on the 3rd try
  this.retries(2);

  beforeEach(() => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    subscription = getSubscriptionId();
    projectPath = path.resolve(testFolder, appName);
    env = environmentManager.getDefaultEnvName();
  });

  afterEach(async () => {
    // clean up
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await cleanUp(appName, projectPath, true, false, false, teamsAppId);
  });

  it(`Create Tab Then Add Function`, { testPlanCaseId: 10306830 }, async function () {
    if (isV3Enabled()) {
      return this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);

    await CliHelper.addResourceToProject(
      projectPath,
      Resource.AzureFunction,
      "--function-name func1"
    );
    await CliHelper.addResourceToProject(
      projectPath,
      Resource.AzureFunction,
      "--function-name func2"
    );

    // set subscription
    await CliHelper.setSubscription(subscription, projectPath);

    // provision
    await CliHelper.provisionProject(projectPath);

    const context = await readContextMultiEnv(projectPath, env);

    // Validate provision
    // Validate Aad App
    const aad = AadValidator.init(context, false, M365Login);
    await AadValidator.validate(aad);

    // Validate Function App
    const functionValidator = new FunctionValidator(context, projectPath, env);
    await functionValidator.validateProvision();

    // deploy
    await CliHelper.deployProject(ResourceToDeploy.Function, projectPath);
    // Validate deployment
    await functionValidator.validateDeploy();

    // validate
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

    // publish
    await execAsyncWithRetry(`teamsfx publish`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      // Validate publish result
      const contextResult = await loadContext(projectPath, env);
      if (contextResult.isErr()) {
        throw contextResult.error;
      }
      const context = contextResult.value;
      const appStudioObject = AppStudioValidator.init(context);
      teamsAppId = appStudioObject.teamsAppId;
      chai.assert.isNotNull(teamsAppId);
      await AppStudioValidator.validatePublish(teamsAppId!);
    }
  });
});
