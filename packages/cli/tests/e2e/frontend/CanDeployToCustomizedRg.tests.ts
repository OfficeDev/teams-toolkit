// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";

import { AadValidator, FrontendValidator } from "../../commonlib";
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
import { Capability, ResourceToDeploy } from "../../commonlib/constants";
import { describe } from "mocha";
import { it } from "../../commonlib/it";

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
    `tab project can deploy frontend hosting resource to customized resource group and successfully provision / deploy`,
    { testPlanCaseId: 9863660 },
    async function () {
      // Create new tab project
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

      // Create empty resource group
      const customizedRgName = `${appName}-customized-rg`;
      await createResourceGroup(customizedRgName, "eastus");

      // Customize simple auth bicep files
      await customizeBicepFilesToCustomizedRg(
        customizedRgName,
        projectPath,
        `name: 'frontendHostingProvision'`
      );

      // Provision
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // deploy
      await CliHelper.deployProject(ResourceToDeploy.FrontendHosting, projectPath);

      // Assert
      {
        const context = await readContextMultiEnv(projectPath, env);

        // Validate Aad App
        const aad = AadValidator.init(context, false, M365Login);
        await AadValidator.validate(aad);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context, true);
        await FrontendValidator.validateProvision(frontend);
        await FrontendValidator.validateDeploy(frontend);
      }

      await deleteResourceGroupByName(customizedRgName);
    }
  );
});
