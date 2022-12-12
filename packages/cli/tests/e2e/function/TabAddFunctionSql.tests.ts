// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import * as path from "path";
import "mocha";
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
import { getUuid } from "../../commonlib/utilities";
import { it } from "@microsoft/extra-shot-mocha";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it(`tab + function + azure sql`, { testPlanCaseId: 15686873 }, async function () {
    if (isV3Enabled()) {
      return this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureSql);

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(
      projectPath,
      `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`
    );

    // Assert
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Function App
      const functionValidator = new FunctionValidator(context, projectPath, env);
      await functionValidator.validateProvision();
    }
  });
});
