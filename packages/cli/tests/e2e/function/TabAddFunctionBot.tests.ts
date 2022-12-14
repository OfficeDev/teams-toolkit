// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import * as path from "path";
import { describe } from "mocha";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { FunctionValidator } from "../../commonlib";
import { it } from "@microsoft/extra-shot-mocha";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });

  it(`tab + function + bot`, { testPlanCaseId: 10308358 }, async function () {
    if (isV3Enabled()) {
      return this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addCapabilityToProject(projectPath, Capability.Bot);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Function App
      const functionValidator = new FunctionValidator(context, projectPath, env);
      await functionValidator.validateProvision();
    }
  });
});
