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
  loadContext,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";

describe("Create a new API Management Service", function () {
  const testProcessEnv = Object.assign({}, process.env);

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  it(`Import API into a new API Management Service`, async function () {
    // new a project
    let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
      cwd: testFolder,
      env: testProcessEnv,
      timeout: 0,
    });
    console.log(`Create new project. Error message: ${result.stderr}`);

    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);

    result = await execAsyncWithRetry(`teamsfx resource add azure-apim`, {
      cwd: projectPath,
      env: testProcessEnv,
      timeout: 0,
    });
    console.log(`Add APIM resource. Error message: ${result.stderr}`);

    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.provisionProject(projectPath);
    result = await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: testProcessEnv,
      timeout: 0,
    });
    console.log(`Provision. Error message: ${result.stderr}`);

    const contextRes = await loadContext(projectPath, "dev");
    if (!contextRes.isOk()) {
      throw contextRes.error;
    }
    const provisionContext = contextRes.value;

    await ApimValidator.validateProvision(provisionContext);

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

    const deployContext = await fs.readJSON(getConfigFileName(appName, true));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1", true);
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true, true);
  });
});
