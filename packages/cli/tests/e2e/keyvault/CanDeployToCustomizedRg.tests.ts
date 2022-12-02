// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
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
  customizeBicepFilesToCustomizedRg,
} from "../commonUtils";
import M365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { KeyVaultValidator } from "../../commonlib/keyVaultValidator";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

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
    `tab + key vault project can deploy keyvault resource to customized resource group and successfully provision`,
    { testPlanCaseId: 15686991 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      // Create new tab + keyvault project
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
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
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // Validate Provision
      {
        const context = await readContextMultiEnv(projectPath, env);

        // Validate Aad App
        const aad = AadValidator.init(context, false, M365Login);
        await AadValidator.validate(aad);

        // Validate Key Vault
        const keyVault = new KeyVaultValidator(context, projectPath, env);
        await keyVault.validate();
      }

      await deleteResourceGroupByName(customizedRgName);
    }
  );
});
