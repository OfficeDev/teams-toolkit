// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
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
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { customizeBicepFilesToCustomizedRg } from "../commonUtils";
import { KeyVaultValidator } from "../../commonlib/keyVaultValidator";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it(`tab + function project can deploy keyvault resource to customized resource group and successfully provision`, async function () {
    // Create new tab + function + keyvault project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureKeyVault);

    // Create empty resource group
    const customizedRgName = `${appName}-customized-rg`;
    await createResourceGroup(customizedRgName, "eastus");

    // Customize simple auth bicep files
    await customizeBicepFilesToCustomizedRg(
      customizedRgName,
      projectPath,
      `name: 'keyVaultProvision'`
    );

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());

    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Function App
    const functionValidator = new FunctionValidator(
      context,
      projectPath,
      environmentManager.getDefaultEnvName()
    );
    await functionValidator.validateProvision();

    // Validate Key Vault
    const keyVault = KeyVaultValidator.init(context);
    await KeyVaultValidator.validate(keyVault);

    // deploy
    await CliHelper.deployProject(ResourceToDeploy.Function, projectPath);
    await functionValidator.validateDeploy();

    await deleteResourceGroupByName(customizedRgName);
  });
});
