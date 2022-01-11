// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import path from "path";

import { AadValidator, FunctionValidator, SimpleAuthValidator } from "../../commonlib";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";

describe("Test Add Function", function () {
  let testFolder: string;
  let appName: string;
  let subscription: string;
  let projectPath: string;
  let env: string;

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
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it(`Create Tab Then Add Function`, async function () {
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
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Simple Auth
    const simpleAuth = new SimpleAuthValidator(context, projectPath, env);
    await simpleAuth.validate();

    // Validate Function App
    const functionValidator = new FunctionValidator(context, projectPath, env);
    await functionValidator.validateProvision();

    // deploy
    await CliHelper.deployProject(ResourceToDeploy.Function, projectPath);
    // Validate deployment
    await functionValidator.validateDeploy();

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
