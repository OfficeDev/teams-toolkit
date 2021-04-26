// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";
import { deleteAadApp, ApimValidator, deleteApimAadApp, MockAzureAccountProvider } from "fx-api";
import { execAsync, getConfigFileName, getSubscriptionId, getTestFolder, getUniqueAppName } from "./commonUtils";
import AppStudioLogin from "../../src/commonlib/appStudioLogin";
import AzureLogin from "../../src/commonlib/azureLogin";
import GraphLogin from "../../src/commonlib/graphLogin";

describe("Create a new API Management Service", function () {
  const subscriptionId = getSubscriptionId();

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`Import API into a new API Management Service`, async function () {
    // new a project
    const newResult = await execAsync(`teamsfx new --app-name ${appName} --azure-resources function --interactive false --verbose false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0
    });
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");

    // set fx-resource-simple-auth.skuName as B1
    const context = await fs.readJSON(getConfigFileName(appName));
    context["fx-resource-simple-auth"]["skuName"] = "B1";
    await fs.writeJSON(getConfigFileName(appName), context, { spaces: 4 });

    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);

    const updateResult = await execAsync(
      `teamsfx resource add apim --subscription ${subscriptionId}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    expect(updateResult.stdout).to.eq("");
    expect(updateResult.stderr).to.eq("");

    const provisionResult = await execAsync(
      `teamsfx provision`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    expect(provisionResult.stdout).to.eq("");
    expect(provisionResult.stderr).to.eq("");

    const provisionContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateProvision(provisionContext, appName);

    const deployResult = await execAsync(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    expect(deployResult.stdout).to.eq("");
    expect(deployResult.stderr).to.eq("");

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  this.afterAll(async () => {
    // delete aad app
    const context = await fs.readJSON(getConfigFileName(appName));
    await deleteAadApp(context, AppStudioLogin);
    await deleteApimAadApp(context, GraphLogin);

    // remove resouce
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(`${appName}-rg`);

    // remove project
    await fs.remove(projectPath);
  });
});
