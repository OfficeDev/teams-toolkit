// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
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
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { FunctionValidator } from "../../commonlib";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false, true);
  });

  it(`tab + function + bot`, async function () {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addCapabilityToProject(projectPath, Capability.Bot);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    {
      const context = await readContextMultiEnv(
        projectPath,
        environmentManager.getDefaultEnvName()
      );

      // Validate Function App
      const functionValidator = new FunctionValidator(
        context,
        projectPath,
        environmentManager.getDefaultEnvName()
      );
      await functionValidator.validateProvision();
    }
  });
});
