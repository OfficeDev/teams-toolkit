// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import "chai";

import { AadValidator, FunctionValidator } from "../../commonlib";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  createResourceGroup,
  deleteResourceGroupByName,
  getProvisionParameterValueByKey,
  getActivePluginsFromProjectSetting,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import {
  Capability,
  provisionParametersKey,
  Resource,
  ResourceToDeploy,
} from "../../commonlib/constants";
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
    // Create new tab + func project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);

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
      const activeResourcePlugins = await getActivePluginsFromProjectSetting(projectPath);
      chai.assert.isArray(activeResourcePlugins);
      const resourceBaseName: string = await getProvisionParameterValueByKey(
        projectPath,
        environmentManager.getDefaultEnvName(),
        provisionParametersKey.resourceBaseName
      );

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Function App
      const functionValidator = new FunctionValidator(
        context,
        activeResourcePlugins as string[],
        resourceBaseName
      );
      await functionValidator.validateProvision();
      await functionValidator.validateDeploy();
    }

    await deleteResourceGroupByName(customizedRgName);
  });
});
