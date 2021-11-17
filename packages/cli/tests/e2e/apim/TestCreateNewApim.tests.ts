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
  readContext,
  loadContext,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";

describe("Create a new API Management Service", function () {
  process.env.SIMPLE_AUTH_SKU_NAME = "B1";
  const testProcessEnv = [Object.assign({}, process.env), Object.assign({}, process.env)];
  testProcessEnv[0]["TEAMSFX_INSIDER_PREVIEW"] = "true";
  testProcessEnv[1]["TEAMSFX_INSIDER_PREVIEW"] = "false";

  testProcessEnv.forEach((input) => {
    const isMultiEnvEnabled = input["TEAMSFX_INSIDER_PREVIEW"] === "true";
    describe(`Multi env enabled: ${isMultiEnvEnabled}`, () => {
      const testFolder = getTestFolder();
      const appName = getUniqueAppName();
      const subscriptionId = getSubscriptionId();
      const projectPath = path.resolve(testFolder, appName);
      it(`Import API into a new API Management Service`, async function () {
        // new a project
        let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
          cwd: testFolder,
          env: input,
          timeout: 0,
        });
        console.log(`Create new project. Error message: ${result.stderr}`);

        await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);

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

        let provisionContext;
        if (isMultiEnvEnabled) {
          const contextRes = await loadContext(projectPath, "dev");
          if (contextRes.isOk()) {
            provisionContext = contextRes.value;
          } else {
            throw contextRes.error;
          }
        } else {
          provisionContext = await readContext(projectPath);
        }

        await ApimValidator.validateProvision(
          provisionContext,
          appName,
          subscriptionId,
          isMultiEnvEnabled
        );

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
