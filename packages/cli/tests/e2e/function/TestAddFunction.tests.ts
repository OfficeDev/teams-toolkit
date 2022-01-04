// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import path from "path";
import * as chai from "chai";

import { AadValidator, FunctionValidator, SimpleAuthValidator } from "../../commonlib";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getActivePluginsFromProjectSetting,
  getProvisionParameterValueByKey,
  readContextMultiEnv,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { CliHelper } from "../../commonlib/cliHelper";
import {
  Capability,
  provisionParametersKey,
  Resource,
  ResourceToDeploy,
} from "../../commonlib/constants";

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
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

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

    const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());
    const activeResourcePlugins = await getActivePluginsFromProjectSetting(projectPath);
    chai.assert.isArray(activeResourcePlugins);
    const resourceBaseName: string = await getProvisionParameterValueByKey(
      projectPath,
      environmentManager.getDefaultEnvName(),
      provisionParametersKey.resourceBaseName
    );

    // Validate provision
    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Simple Auth
    const simpleAuth = SimpleAuthValidator.init(context);
    await SimpleAuthValidator.validate(simpleAuth, aad, "B1", true);

    // Validate Function App
    const functionValidator = new FunctionValidator(
      context,
      activeResourcePlugins as string[],
      resourceBaseName
    );
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
