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
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";

describe("Import API into API Management", function () {
  const testProcessEnv = Object.assign({}, process.env);
  testProcessEnv["SIMPLE_AUTH_SKU_NAME"] = "B1";

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
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
      ` --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      testProcessEnv,
      3,
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-version v1`
    );
  });

  it(`Create a new API version in Azure API Management`, async function () {
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    await CliHelper.deployProject(
      ResourceToDeploy.Apim,
      projectPath,
      `--api-version v2`,
      testProcessEnv
    );

    const deployContext = await fs.readJSON(getConfigFileName(appName, true));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v2");
  });

  it(`Update an existing API version in Azure API Management`, async function () {
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    await CliHelper.deployProject(
      ResourceToDeploy.Apim,
      projectPath,
      `--api-version v1`,
      testProcessEnv
    );

    const deployContext = await fs.readJSON(getConfigFileName(appName, true));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true, true);
  });
});
