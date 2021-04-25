// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";
import { deleteAadApp, ApimValidator, deleteApimAadApp, MockAzureAccountProvider } from "fx-api";
import { execAsync, getTestFolder, getUniqueAppName } from "./commonUtils";
import AppStudioLogin from "../../src/commonlib/appStudioLogin";
import AzureLogin from "../../src/commonlib/azureLogin";
import GraphLogin from "../../src/commonlib/graphLogin";

describe("Import API into an existing API Management Service", function () {
  // TODO: Move subscriptionId to env
  const subscriptionId = "1756abc0-3554-4341-8d6a-46674962ea19";

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const existingApimResourceGroupName = `${appName}existing`

  it(`Import API into an existing API Management Service`, async function () {
    // new a project
    const newResult = await execAsync(`teamsfx new --app-name ${appName} --azure-resources function --interactive false --verbose false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0
    });
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");

    // set fx-resource-simple-auth.skuName as B1
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    context["fx-resource-simple-auth"]["skuName"] = "B1";
    await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });

    const updateResult = await execAsync(
      `teamsfx resource add apim --subscription ${subscriptionId} --apim-resource-group ${existingApimResourceGroupName} --apim-service-name ${appName}-existing-apim`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    const initContext = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    await ApimValidator.prepareApiManagementService(existingApimResourceGroupName, `${appName}-existing-apim`);

    const provisionResult = await execAsync(
      `teamsfx provision`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    const provisionContext = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    await ApimValidator.validateProvision(provisionContext, appName, existingApimResourceGroupName, `${appName}-existing-apim`);

    const deployResult = await execAsync(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    const deployContext = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  this.afterAll(async () => {
    // delete aad app
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    await deleteAadApp(context, AppStudioLogin);
    await deleteApimAadApp(context, GraphLogin);

    // remove resouce
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(`${appName}-rg`);
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(existingApimResourceGroupName);

    // remove project
    await fs.remove(projectPath);
  });
});
