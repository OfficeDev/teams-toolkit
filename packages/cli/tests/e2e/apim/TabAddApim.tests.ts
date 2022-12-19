// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";
import "mocha";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { ApimValidator } from "../../commonlib";
import { it } from "@microsoft/extra-shot-mocha";
import AzureLogin from "../../../src/commonlib/azureLogin";
import M365Login from "../../../src/commonlib/m365Login";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, false, true);
  });

  it(`tab + apim`, { testPlanCaseId: 15685496 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await ApimValidator.init(subscription, AzureLogin, M365Login);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureApim);

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    await ApimValidator.validateProvision(context);
  });
});
