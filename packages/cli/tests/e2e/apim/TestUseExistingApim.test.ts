// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";
import { ApimValidator } from "../../commonlib";
import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  getConfigFileName,
  cleanUp,
  cleanUpResourceGroup,
  readContext,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";
import { isArmSupportEnabled } from "@microsoft/teamsfx-core";

describe("Use an existing API Management Service", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const existingRGName = `${appName}existing`;
  const existingRGNameExtend = `${existingRGName}-rg`;
  const testProcessEnv = Object.assign({}, process.env);
  testProcessEnv["SIMPLE_AUTH_SKU_NAME"] = "B1";

  it(`Import API into an existing API Management Service`, async function () {
    if (isArmSupportEnabled()) {
      return;
    }

    // new a project
    let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
      cwd: testFolder,
      env: testProcessEnv,
      timeout: 0,
    });
    console.log(`Create new project. Error message: ${result.stderr}`);

    result = await execAsyncWithRetry(
      `teamsfx resource add azure-apim --subscription ${subscriptionId} --apim-resource-group ${existingRGNameExtend} --apim-service-name ${appName}-existing-apim`,
      {
        cwd: projectPath,
        env: testProcessEnv,
        timeout: 0,
      }
    );
    console.log(`Add APIM resource. Error message: ${result.stderr}`);

    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    await ApimValidator.prepareApiManagementService(
      existingRGNameExtend,
      `${appName}-existing-apim`
    );

    result = await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: testProcessEnv,
      timeout: 0,
    });
    console.log(`Provision. Error message: ${result.stderr}`);

    const provisionContext = await readContext(projectPath);
    await ApimValidator.validateProvision(
      provisionContext,
      appName,
      subscriptionId,
      false,
      existingRGNameExtend,
      `${appName}-existing-apim`
    );

    result = await execAsyncWithRetry(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: testProcessEnv,
        timeout: 0,
      },
      3,
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-version v1`
    );
    console.log(`Deploy. Error message: ${result.stderr}`);

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1", false);
  });

  after(async () => {
    if (isArmSupportEnabled()) {
      return;
    }
    await Promise.all([
      // clean up another resource group
      cleanUpResourceGroup(existingRGName, false),
      // clean up other resources
      cleanUp(appName, projectPath, true, false, true),
    ]);
  });
});
