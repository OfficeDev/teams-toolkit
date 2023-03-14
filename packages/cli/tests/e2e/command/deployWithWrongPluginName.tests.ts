// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import { expect } from "chai";
import path from "path";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, ResourceToDeploy } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

import {
  getTestFolder,
  getUniqueAppName,
  getSubscriptionId,
  setBotSkuNameToB1Bicep,
  cleanUp,
} from "../commonUtils";

describe("teamsfx deploy frontend-hosting", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const subscription = getSubscriptionId();

  it(`in bot project`, { testPlanCaseId: 15685958 }, async function () {
    /// TODO: will be deleted when not support V2
    if (isV3Enabled()) {
      this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

    // Provision
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // deploy
    try {
      await CliHelper.deployProject(ResourceToDeploy.FrontendHosting, projectPath);
      throw "should throw an error";
    } catch (e) {
      expect(e.message).includes("fx.NoResourcePluginSelected");
    }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, false, true, false);
  });
});
