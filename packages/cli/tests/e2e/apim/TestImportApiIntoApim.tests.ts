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
  getConfigFileName,
  cleanUp,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";

describe("Import API into API Management", function () {
  process.env.SIMPLE_AUTH_SKU_NAME = "B1";
  const testProcessEnv = [Object.assign({}, process.env), Object.assign({}, process.env)];
  testProcessEnv[0]["TEAMSFX_INSIDER_PREVIEW"] = "true";
  testProcessEnv[0]["SIMPLE_AUTH_SKU_NAME"] = "B1";
  testProcessEnv[1]["TEAMSFX_INSIDER_PREVIEW"] = "false";
  testProcessEnv[1]["SIMPLE_AUTH_SKU_NAME"] = "B1";

  testProcessEnv.forEach((input) => {
    const isMultiEnvEnabled = input["TEAMSFX_INSIDER_PREVIEW"] === "true";
    describe(`Multi env enabled: ${isMultiEnvEnabled}`, () => {
      const testFolder = getTestFolder();
      const appName = getUniqueAppName();
      const subscriptionId = getSubscriptionId();
      const projectPath = path.resolve(testFolder, appName);
      before(async () => {
        // new a project
        let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
          cwd: testFolder,
          env: input,
          timeout: 0,
        });
        console.log(`Create new project. Error message: ${result.stderr}`);

        result = await execAsyncWithRetry(
          `teamsfx resource add azure-apim --subscription ${subscriptionId}`,
          {
            cwd: projectPath,
            env: input,
            timeout: 0,
          }
        );
        console.log(`Add APIM resource. Error message: ${result.stderr}`);

        result = await execAsyncWithRetry(`teamsfx provision`, {
          cwd: projectPath,
          env: input,
          timeout: 0,
        });
        console.log(`Provision. Error message: ${result.stderr}`);

        result = await execAsyncWithRetry(
          `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
          {
            cwd: projectPath,
            env: input,
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
          env: input,
          timeout: 0,
        });
        console.log(`Deploy. Error message: ${result.stderr}`);

        const deployContext = await fs.readJSON(getConfigFileName(appName, isMultiEnvEnabled));
        await ApimValidator.validateDeploy(
          deployContext,
          projectPath,
          appName,
          "v2",
          isMultiEnvEnabled
        );
      });

      it(`Update an existing API version in Azure API Management`, async function () {
        await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
        const result = await execAsyncWithRetry(`teamsfx deploy apim --api-version v1`, {
          cwd: projectPath,
          env: input,
          timeout: 0,
        });
        console.log(`Deploy. Error message: ${result.stderr}`);

        const deployContext = await fs.readJSON(getConfigFileName(appName, isMultiEnvEnabled));
        await ApimValidator.validateDeploy(
          deployContext,
          projectPath,
          appName,
          "v1",
          isMultiEnvEnabled
        );
      });

      after(async () => {
        // clean up
        await cleanUp(appName, projectPath, true, false, true, isMultiEnvEnabled);
      });
    });
  });
});
