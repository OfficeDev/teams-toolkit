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
  getActivePluginsFromProjectSetting,
  getProvisionParameterValueByKey,
} from "../commonUtils";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import {
  Capability,
  StateConfigKey,
  PluginId,
  Resource,
  provisionParametersKey,
} from "../../commonlib/constants";
import { FunctionValidator } from "../../commonlib";

describe("Configuration successfully changed when with different plugins", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it(`tab project with function and key vault resources`, async function () {
    // Create tab project with function and key vault
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureKeyVault);

    // Provision
    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
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
      const func = FunctionValidator.init(
        context,
        activeResourcePlugins as string[],
        resourceBaseName,
        true
      );
      await FunctionValidator.validateProvision(func, false, true);
    }
  });
});
