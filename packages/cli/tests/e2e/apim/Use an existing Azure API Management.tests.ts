// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { ApimValidator } from "fx-api";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  getConfigFileName,
  cleanUp,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";

describe("Use an existing API Management Service", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const existingApimResourceGroupName = `${appName}existing`

  it(`Import API into an existing API Management Service`, async function () {
    // new a project
    await execAsync(
      `teamsfx new --app-name ${appName} --azure-resources function --interactive false`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );

    await setSimpleAuthSkuNameToB1(projectPath);

    await execAsync(
      `teamsfx resource add apim --subscription ${subscriptionId} --apim-resource-group ${existingApimResourceGroupName} --apim-service-name ${appName}-existing-apim`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    await ApimValidator.prepareApiManagementService(existingApimResourceGroupName, `${appName}-existing-apim`);

    await execAsync(
      `teamsfx provision`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    const provisionContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateProvision(provisionContext, appName, existingApimResourceGroupName, `${appName}-existing-apim`);

    await execAsync(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  this.afterAll(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true);
  });
});
