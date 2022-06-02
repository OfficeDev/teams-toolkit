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
  loadContext,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import M365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { describe } from "mocha";
import { it } from "../../commonlib/it";

describe("Create a new API Management Service", function () {
  const testProcessEnv = Object.assign({}, process.env);

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();
  it(
    `Import API into a new API Management Service`,
    { testPlanCaseId: 10107958 },
    async function () {
      // new a project
      await CliHelper.createProjectWithCapability(
        appName,
        testFolder,
        Capability.Tab,
        testProcessEnv
      );
      await ApimValidator.init(subscriptionId, AzureLogin, M365Login);
      await CliHelper.addResourceToProject(projectPath, Resource.AzureApim, "", testProcessEnv);

      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.provisionProject(projectPath, "", testProcessEnv);

      const contextRes = await loadContext(projectPath, env);
      if (!contextRes.isOk()) {
        throw contextRes.error;
      }
      const provisionContext = contextRes.value;

      await ApimValidator.validateProvision(provisionContext);

      await CliHelper.deployProject(
        ResourceToDeploy.Apim,
        projectPath,
        ` --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
        testProcessEnv,
        3,
        `teamsfx deploy apim --open-api-document openapi/openapi.json --api-version v1`
      );

      const deployContext = await fs.readJSON(getConfigFileName(appName));
      await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
    }
  );

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true);
  });
});
