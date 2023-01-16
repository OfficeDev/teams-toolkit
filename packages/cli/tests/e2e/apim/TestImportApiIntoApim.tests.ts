// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";
import { ApimValidator } from "../../commonlib";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  getConfigFileName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  convertToAlphanumericOnly,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import M365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { describe } from "mocha";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Import API into API Management", function () {
  if (isV3Enabled()) {
    return;
  }
  const testProcessEnv = Object.assign({}, process.env);
  testProcessEnv["SIMPLE_AUTH_SKU_NAME"] = "B1";

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const apiPrefix = convertToAlphanumericOnly(appName);
  before(async () => {
    // new a project
    await CliHelper.createProjectWithCapability(
      appName,
      testFolder,
      Capability.Tab,
      testProcessEnv
    );
    await CliHelper.addResourceToProject(projectPath, Resource.AzureApim, "", testProcessEnv);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

    await CliHelper.provisionProject(projectPath, "", testProcessEnv);

    await CliHelper.deployProject(
      ResourceToDeploy.Apim,
      projectPath,
      ` --open-api-document openapi/openapi.json --api-prefix ${apiPrefix} --api-version v1`,
      testProcessEnv,
      3,
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-version v1`
    );
  });

  it(
    `Create a new API version in Azure API Management`,
    { testPlanCaseId: 10107968 },
    async function () {
      await ApimValidator.init(subscriptionId, AzureLogin, M365Login);
      await CliHelper.deployProject(
        ResourceToDeploy.Apim,
        projectPath,
        `--api-version v2`,
        testProcessEnv
      );

      const deployContext = await fs.readJSON(getConfigFileName(appName));
      await ApimValidator.validateDeploy(deployContext, projectPath, apiPrefix, "v2");
    }
  );

  it(
    `Update an existing API version in Azure API Management`,
    { testPlanCaseId: 10116782 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      await ApimValidator.init(subscriptionId, AzureLogin, M365Login);
      await CliHelper.deployProject(
        ResourceToDeploy.Apim,
        projectPath,
        `--api-version v1`,
        testProcessEnv
      );

      const deployContext = await fs.readJSON(getConfigFileName(appName));
      await ApimValidator.validateDeploy(deployContext, projectPath, apiPrefix, "v1");
    }
  );

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true);
  });
});
