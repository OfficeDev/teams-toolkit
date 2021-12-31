// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";

import { AadValidator, FunctionValidator } from "../../commonlib";
import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  createResourceGroup,
  deleteResourceGroupByName,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, PluginId, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { customizeBicepFilesToCustomizedRg } from "../commonUtils";

describe("Deploy to customized resource group", function () {
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

  it(`tab project can deploy function resource to customized resource group and successfully provision / deploy`, async function () {
    // Create new tab project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    await execAsync(`teamsfx resource add ${Resource.AzureFunction} --function-name func1`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] add function to ${projectPath}`);

    // Create empty resource group
    const customizedRgName = `${appName}-customized-rg`;
    await createResourceGroup(customizedRgName, "eastus");

    // Customize simple auth bicep files
    await customizeBicepFilesToCustomizedRg(
      customizedRgName,
      projectPath,
      `name: 'functionProvision'`,
      `name: 'addTeamsFxFunctionConfiguration'`
    );

    // Provision
    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // deploy
    await CliHelper.deployProject(ResourceToDeploy.Function, projectPath);

    // Assert
    {
      const context = await readContextMultiEnv(
        projectPath,
        environmentManager.getDefaultEnvName()
      );

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Function App
      const func = FunctionValidator.init(context, true);
      await FunctionValidator.validateProvision(func, false, true);
      await FunctionValidator.validateDeploy(func);
    }

    await deleteResourceGroupByName(customizedRgName);
  });
});
