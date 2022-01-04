// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import "mocha";
import "chai";

import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  getActivePluginsFromProjectSetting,
  getProvisionParameterValueByKey,
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, provisionParametersKey } from "../../commonlib/constants";
import { FunctionValidator } from "../../commonlib";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it(`tab + function + azure sql`, async function () {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureSql);

    // Provision
    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    {
      const context = await readContextMultiEnv(
        projectPath,
        environmentManager.getDefaultEnvName()
      );
      const activeResourcePlugins = await getActivePluginsFromProjectSetting(projectPath);
      chai.assert.isArray(activeResourcePlugins);
      const resourceBaseName: string = await getProvisionParameterValueByKey(
        projectPath,
        environmentManager.getDefaultEnvName(),
        provisionParametersKey.resourceBaseName
      );

      // Validate Function App
      const functionValidator = new FunctionValidator(
        context,
        activeResourcePlugins as string[],
        resourceBaseName
      );
      await functionValidator.validateProvision();
    }
  });
});
