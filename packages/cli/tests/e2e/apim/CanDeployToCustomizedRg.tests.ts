// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";
import "mocha";
import fs from "fs-extra";
import { ApimValidator } from "../../commonlib/apimValidator";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  createResourceGroup,
  deleteResourceGroupByName,
  getConfigFileName,
  convertToAlphanumericOnly,
  customizeBicepFilesToCustomizedRg,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";
import AzureLogin from "../../../src/commonlib/azureLogin";
import M365Login from "../../../src/commonlib/m365Login";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();
  const apiPrefix = convertToAlphanumericOnly(appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it(
    `tab project can deploy apim resource to customized resource group and successfully provision / deploy`,
    { testPlanCaseId: 15685059 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      // Create new tab project
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
      await CliHelper.addResourceToProject(projectPath, Resource.AzureApim);

      // Create empty resource group
      const customizedRgName = `${appName}-customized-rg`;
      await createResourceGroup(customizedRgName, "eastus");

      // Customize simple auth bicep files
      await customizeBicepFilesToCustomizedRg(
        customizedRgName,
        projectPath,
        `name: 'apimProvision'`,
        `name: 'teamsFxApimConfig'`
      );

      // Provision
      setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // Validate Provision
      const context = await readContextMultiEnv(projectPath, env);
      await ApimValidator.init(subscription, AzureLogin, M365Login);
      await ApimValidator.validateProvision(context);

      // deploy
      await CliHelper.deployProject(
        ResourceToDeploy.Apim,
        projectPath,
        ` --open-api-document openapi/openapi.json --api-prefix ${apiPrefix} --api-version v1`,
        process.env,
        3,
        `teamsfx deploy apim --open-api-document openapi/openapi.json --api-version v1`
      );

      const deployContext = await fs.readJSON(getConfigFileName(appName));
      await ApimValidator.validateDeploy(deployContext, projectPath, apiPrefix, "v1");

      await deleteResourceGroupByName(customizedRgName);
    }
  );
});
