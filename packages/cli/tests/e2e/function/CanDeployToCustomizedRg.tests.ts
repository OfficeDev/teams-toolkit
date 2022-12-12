// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import * as path from "path";
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
  customizeBicepFilesToCustomizedRg,
} from "../commonUtils";
import M365Login from "../../../src/commonlib/m365Login";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it(
    `tab project can deploy function resource to customized resource group and successfully provision / deploy`,
    { testPlanCaseId: 15686840 },
    async function () {
      if (isV3Enabled()) {
        return this.skip();
      }
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
        `name: 'azureFunctionApiProvision'`,
        `name: 'teamsFxAzureFunctionApiConfig'`
      );

      // Provision
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // deploy
      await CliHelper.deployProject(ResourceToDeploy.Function, projectPath);

      // Assert
      {
        const context = await readContextMultiEnv(projectPath, env);

        // Validate Aad App
        const aad = AadValidator.init(context, false, M365Login);
        await AadValidator.validate(aad);

        // Validate Function App
        const functionValidator = new FunctionValidator(context, projectPath, env);
        await functionValidator.validateProvision();
        await functionValidator.validateDeploy();
      }

      await deleteResourceGroupByName(customizedRgName);
    }
  );
});
