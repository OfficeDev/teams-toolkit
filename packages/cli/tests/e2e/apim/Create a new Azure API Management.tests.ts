// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { ApimValidator } from "@microsoft/teamsfx-api";

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

describe("Create a new API Management Service", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Import API into a new API Management Service`, async function () {
    // new a project
    await execAsync(
      `teamsfx new --app-name ${appName} --interactive false`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );

    await setSimpleAuthSkuNameToB1(projectPath);

    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);

    await execAsync(
      `teamsfx resource add azure-apim --subscription ${subscriptionId}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    await execAsync(
      `teamsfx provision`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    const provisionContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateProvision(provisionContext, appName);

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

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true);
  });
});
