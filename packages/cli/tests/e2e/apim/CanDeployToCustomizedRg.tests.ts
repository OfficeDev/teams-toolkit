// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import "mocha";

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
  execAsyncWithRetry,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { customizeBicepFilesToCustomizedRg } from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it(`tab project can deploy apim resource to customized resource group and successfully provision / deploy`, async function () {
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
      `name: 'addTeamsFxApimConfiguration'`
    );

    // Provision
    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());
    await ApimValidator.init(subscription, AzureLogin, GraphLogin);
    await ApimValidator.validateProvision(context);

    // deploy
    const result = await execAsyncWithRetry(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      },
      3,
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-version v1`
    );
    console.log(`Deploy. Error message: ${result.stderr}`);

    await ApimValidator.validateDeploy(context, projectPath, appName, "v1", true);

    await deleteResourceGroupByName(customizedRgName);
  });
});
