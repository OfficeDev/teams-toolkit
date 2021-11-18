// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { ApimValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  getConfigFileName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";

describe("Import API into API Management", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  process.env.TEAMSFX_INSIDER_PREVIEW = "true";

  before(async () => {
    // new a project
    let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`Create new project. Error message: ${result.stderr}`);

    if (isMultiEnvEnabled()) {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setSimpleAuthSkuNameToB1(projectPath);
    }

    result = await execAsyncWithRetry(
      `teamsfx resource add azure-apim --subscription ${subscriptionId}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(`Add APIM resource. Error message: ${result.stderr}`);

    result = await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`Provision. Error message: ${result.stderr}`);

    result = await execAsyncWithRetry(
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
  });

  it(`Create a new API version in Azure API Management`, async function () {
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    const result = await execAsyncWithRetry(`teamsfx deploy apim --api-version v2`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`Deploy. Error message: ${result.stderr}`);

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v2");
  });

  it(`Update an existing API version in Azure API Management`, async function () {
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    const result = await execAsyncWithRetry(`teamsfx deploy apim --api-version v1`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`Deploy. Error message: ${result.stderr}`);

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  after(async () => {
    // clean up
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, false, true, true);
    } else {
      await cleanUp(appName, projectPath, true, false, true);
    }
  });
});
