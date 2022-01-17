// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Chaoyi Yuan <chyuan@microsoft.com>
 */

import path from "path";

import { AadValidator, SimpleAuthValidator } from "../../commonlib";

import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, ResourceToDeploy } from "../../commonlib/constants";

describe("Provision", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`Provision Resource: Provision SimpleAuth with different pricing tier - Test Plan ID 9576788`, async function () {
    // set env
    process.env.SIMPLE_AUTH_SKU_NAME = "D1";

    // new a project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);

    // provision
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Get context
    const context = await readContextMultiEnv(projectPath, env);

    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Simple Auth
    const simpleAuth = new SimpleAuthValidator(context, projectPath, env);
    await simpleAuth.validate();

    // deploy
    await CliHelper.deployProject(ResourceToDeploy.FrontendHosting, projectPath);
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });
});
